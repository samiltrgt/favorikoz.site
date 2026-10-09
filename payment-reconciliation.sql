-- Apply after orders-iyzico-basket-id-migration.sql and tracking-measurement-v4.sql.
-- Service-role-only financial reconciliation. Existing purchase trigger owns deduplication.
BEGIN;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS iyzico_payment_id text,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_check_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_next_check_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS payment_check_lease_until timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reconciliation_enabled boolean NOT NULL DEFAULT false;
-- Existing orders stay outside the new background process. Only new inserts opt in.
ALTER TABLE public.orders ALTER COLUMN payment_reconciliation_enabled SET DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS orders_iyzico_payment_id_unique ON public.orders(iyzico_payment_id) WHERE iyzico_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_payment_check_due ON public.orders(payment_next_check_at);

CREATE OR REPLACE FUNCTION public.reconcile_verified_payment(p_order_id uuid, p_payment_id text, p_basket_id text, p_total bigint)
RETURNS SETOF public.orders LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE selected_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO selected_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR selected_order.status::text = 'refunded' OR selected_order.payment_status::text = 'refunded'
    OR selected_order.payment_status::text NOT IN ('pending','failed','completed')
    OR selected_order.iyzico_basket_id IS DISTINCT FROM p_basket_id
    OR selected_order.total IS DISTINCT FROM p_total OR p_total <= 0
    OR p_payment_id IS NULL OR p_payment_id !~ '^[0-9]{1,32}$'
    OR (selected_order.iyzico_payment_id IS NOT NULL AND selected_order.iyzico_payment_id <> p_payment_id) THEN RETURN; END IF;
  -- A completed record never changes its fulfillment state on a duplicate notification.
  IF selected_order.payment_status::text <> 'completed' THEN
    IF selected_order.status::text = 'pending' THEN
      UPDATE public.orders SET payment_status = 'completed', status = 'paid', iyzico_payment_id = p_payment_id,
        payment_verified_at = now(), payment_check_lease_until = NULL, updated_at = now()
      WHERE id = p_order_id RETURNING * INTO selected_order;
    ELSE
      UPDATE public.orders SET payment_status = 'completed', iyzico_payment_id = p_payment_id,
        payment_verified_at = now(), payment_check_lease_until = NULL, updated_at = now()
      WHERE id = p_order_id RETURNING * INTO selected_order;
    END IF;
  ELSE
    UPDATE public.orders SET iyzico_payment_id = p_payment_id, payment_verified_at = coalesce(payment_verified_at, now()),
      payment_check_lease_until = NULL WHERE id = p_order_id RETURNING * INTO selected_order;
  END IF;
  RETURN NEXT selected_order;
END $$;

CREATE OR REPLACE FUNCTION public.claim_payment_checks(p_limit integer DEFAULT 5)
RETURNS SETOF public.orders LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY WITH candidates AS (
    SELECT id FROM public.orders WHERE payment_status::text IN ('pending','failed') AND status::text <> 'refunded'
      AND payment_reconciliation_enabled = true
      AND payment_token IS NOT NULL AND iyzico_basket_id IS NOT NULL
      AND created_at > now() - interval '90 days' AND payment_next_check_at <= now()
      AND (payment_check_lease_until IS NULL OR payment_check_lease_until < now())
    ORDER BY payment_next_check_at, created_at LIMIT greatest(1,least(p_limit,5)) FOR UPDATE SKIP LOCKED
  ) UPDATE public.orders o SET payment_check_attempts = o.payment_check_attempts + 1,
    payment_check_lease_until = now() + interval '3 minutes',
    payment_next_check_at = now() + least(86400, 60 * power(2,least(o.payment_check_attempts,11))) * interval '1 second'
    FROM candidates WHERE o.id = candidates.id RETURNING o.*;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_verified_payment(uuid,text,text,bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_payment_checks(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_verified_payment(uuid,text,text,bigint), public.claim_payment_checks(integer) TO service_role;
COMMIT;
