-- Apply after the existing order/coupon/analytics migrations. No historical backfill:
-- legacy meta_purchase_sent_at could be a failed pre-send lock, not proof of delivery.
-- Statement may run before BEGIN; comparisons below cast enums to text.
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'refunded';

BEGIN;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tracking_outbox_status text,
  ADD COLUMN IF NOT EXISTS meta_purchase_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.tracking_consent (
  owner_hash text PRIMARY KEY CHECK (owner_hash ~ '^[a-f0-9]{64}$'),
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  version bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tracking_consent ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tracking_consent FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tracking_consent TO service_role;

CREATE TABLE IF NOT EXISTS public.tracking_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  owner_hash text REFERENCES public.tracking_consent(owner_hash),
  event_name text NOT NULL,
  event_id text NOT NULL,
  event_time bigint NOT NULL DEFAULT extract(epoch FROM now())::bigint,
  payload jsonb NOT NULL,
  delivery jsonb NOT NULL DEFAULT '{"meta":"pending","ga4":"pending"}'::jsonb,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','suppressed')),
  lease_token uuid,
  lease_until timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (event_name, event_id)
);
ALTER TABLE public.tracking_outbox ADD COLUMN IF NOT EXISTS owner_hash text REFERENCES public.tracking_consent(owner_hash);
CREATE INDEX IF NOT EXISTS tracking_outbox_owner ON public.tracking_outbox(owner_hash);
CREATE INDEX IF NOT EXISTS orders_tracking_consent_owner ON public.orders ((tracking->>'consent_owner'));
CREATE INDEX IF NOT EXISTS tracking_outbox_due ON public.tracking_outbox(next_attempt_at) WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS tracking_outbox_order ON public.tracking_outbox(order_id);
ALTER TABLE public.tracking_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tracking_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tracking_outbox TO service_role;

-- Tracking contains approved ad IDs and IP/UA. Restrict order writes to service role
-- so customers cannot self-confirm payments or forge marketing permission via orders.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.orders FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sanitize_tracking_consent(p_tracking jsonb, p_analytics boolean, p_marketing boolean)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE sanitized jsonb := coalesce(p_tracking, '{}'::jsonb);
  analytics boolean := p_analytics AND coalesce(p_tracking #>> '{consent,analytics}', 'false') = 'true';
  marketing boolean := p_marketing AND coalesce(p_tracking #>> '{consent,marketing}', 'false') = 'true';
BEGIN
  IF NOT marketing THEN
    sanitized := sanitized - ARRAY['fbp','fbc','fbclid','gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm','external_id','ip','user_agent','client_ip','client_user_agent'];
  END IF;
  IF NOT analytics THEN sanitized := sanitized - ARRAY['client_id','session_id','google_client_id','google_session_id']; END IF;
  RETURN sanitized || jsonb_build_object('consent', jsonb_build_object(
    'analytics', analytics, 'marketing', marketing));
END $$;

-- Lock order rows before the owner row in preference updates; order triggers use
-- the same order->owner lock order, preventing payment/revocation deadlocks.
CREATE OR REPLACE FUNCTION public.apply_tracking_owner_consent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner text := NEW.tracking->>'consent_owner'; state public.tracking_consent%ROWTYPE;
BEGIN
  IF owner IS NULL THEN RETURN NEW; END IF;
  IF owner !~ '^[a-f0-9]{64}$' OR coalesce(NEW.tracking->>'consent_version','') !~ '^[0-9]{1,16}$' THEN
    NEW.tracking := jsonb_build_object('consent', jsonb_build_object('analytics',false,'marketing',false)); RETURN NEW;
  END IF;
  INSERT INTO public.tracking_consent(owner_hash,analytics,marketing,version)
    VALUES(owner, coalesce(NEW.tracking #>> '{consent,analytics}', 'false') = 'true', coalesce(NEW.tracking #>> '{consent,marketing}', 'false') = 'true', (NEW.tracking->>'consent_version')::bigint)
    ON CONFLICT (owner_hash) DO NOTHING;
  SELECT * INTO state FROM public.tracking_consent WHERE owner_hash = owner FOR SHARE;
  IF (NEW.tracking->>'consent_version')::bigint < state.version THEN
    NEW.tracking := public.sanitize_tracking_consent(NEW.tracking,false,false);
  ELSE
    NEW.tracking := public.sanitize_tracking_consent(NEW.tracking, state.analytics, state.marketing);
  END IF;
  IF coalesce(NEW.tracking #>> '{consent,marketing}','false') <> 'true' THEN
    NEW.fbp := NULL; NEW.fbc := NULL; NEW.fbclid := NULL; NEW.gclid := NULL; NEW.gbraid := NULL; NEW.wbraid := NULL;
    NEW.utm_source := NULL; NEW.utm_medium := NULL; NEW.utm_campaign := NULL; NEW.utm_content := NULL; NEW.utm_term := NULL;
    NEW.client_ip := NULL; NEW.client_user_agent := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_apply_tracking_owner ON public.orders;
CREATE TRIGGER orders_apply_tracking_owner BEFORE INSERT OR UPDATE OF tracking,payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_tracking_owner_consent();

CREATE OR REPLACE FUNCTION public.enqueue_tracking_browser(p_owner_hash text, p_version bigint, p_consent jsonb, p_event jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE state public.tracking_consent%ROWTYPE;
BEGIN
  IF p_owner_hash IS NULL OR p_owner_hash !~ '^[a-f0-9]{64}$' OR p_version <= 0 THEN RETURN false; END IF;
  INSERT INTO public.tracking_consent(owner_hash,analytics,marketing,version)
    VALUES(p_owner_hash, coalesce(p_consent->>'analytics','false') = 'true', coalesce(p_consent->>'marketing','false') = 'true', p_version)
    ON CONFLICT (owner_hash) DO NOTHING;
  SELECT * INTO state FROM public.tracking_consent WHERE owner_hash = p_owner_hash FOR UPDATE;
  IF p_version <> state.version OR NOT state.marketing OR coalesce(p_consent->>'marketing','false') <> 'true' THEN RETURN false; END IF;
  INSERT INTO public.tracking_outbox(owner_hash,event_name,event_id,event_time,payload,delivery)
    VALUES(p_owner_hash,p_event->>'event_name',p_event->>'event_id',(p_event->>'event_time')::bigint,
      jsonb_build_object('meta',p_event),'{"meta":"pending","ga4":"skipped"}'::jsonb)
    ON CONFLICT (event_name,event_id) DO NOTHING;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.update_tracking_consent(p_owner_hash text, p_version bigint, p_analytics boolean, p_marketing boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE state public.tracking_consent%ROWTYPE;
BEGIN
  IF p_owner_hash IS NULL OR p_owner_hash !~ '^[a-f0-9]{64}$' OR p_version <= 0 THEN RETURN false; END IF;
  PERFORM id FROM public.orders WHERE tracking->>'consent_owner' = p_owner_hash ORDER BY id FOR UPDATE;
  INSERT INTO public.tracking_consent(owner_hash,version) VALUES(p_owner_hash,0) ON CONFLICT (owner_hash) DO NOTHING;
  SELECT * INTO state FROM public.tracking_consent WHERE owner_hash = p_owner_hash FOR UPDATE;
  IF p_version < state.version THEN RETURN false; END IF;
  -- Equal versions cannot change the saved decision, protecting replayed grants.
  IF p_version = state.version AND (p_analytics IS DISTINCT FROM state.analytics OR p_marketing IS DISTINCT FROM state.marketing) THEN RETURN false; END IF;
  UPDATE public.tracking_consent SET analytics = p_analytics, marketing = p_marketing, version = p_version, updated_at = now() WHERE owner_hash = p_owner_hash;
  IF p_analytics AND p_marketing THEN RETURN true; END IF;
  UPDATE public.orders SET tracking = public.sanitize_tracking_consent(tracking,p_analytics,p_marketing) || jsonb_build_object('consent_version',p_version),
    fbp = CASE WHEN p_marketing THEN fbp ELSE NULL END,
    fbc = CASE WHEN p_marketing THEN fbc ELSE NULL END,
    fbclid = CASE WHEN p_marketing THEN fbclid ELSE NULL END,
    gclid = CASE WHEN p_marketing THEN gclid ELSE NULL END,
    gbraid = CASE WHEN p_marketing THEN gbraid ELSE NULL END,
    wbraid = CASE WHEN p_marketing THEN wbraid ELSE NULL END,
    utm_source = CASE WHEN p_marketing THEN utm_source ELSE NULL END,
    utm_medium = CASE WHEN p_marketing THEN utm_medium ELSE NULL END,
    utm_campaign = CASE WHEN p_marketing THEN utm_campaign ELSE NULL END,
    utm_content = CASE WHEN p_marketing THEN utm_content ELSE NULL END,
    utm_term = CASE WHEN p_marketing THEN utm_term ELSE NULL END,
    client_ip = CASE WHEN p_marketing THEN client_ip ELSE NULL END,
    client_user_agent = CASE WHEN p_marketing THEN client_user_agent ELSE NULL END
    WHERE tracking->>'consent_owner' = p_owner_hash;
  UPDATE public.tracking_outbox SET
    delivery = jsonb_build_object(
      'meta', CASE WHEN delivery->>'meta' = 'sent' THEN 'sent' WHEN NOT p_marketing THEN 'skipped' ELSE delivery->>'meta' END,
      'ga4', CASE WHEN delivery->>'ga4' = 'sent' THEN 'sent' WHEN NOT p_analytics THEN 'skipped' ELSE delivery->>'ga4' END),
    payload = CASE WHEN order_id IS NULL THEN CASE WHEN p_marketing THEN payload ELSE payload - 'meta' END
      ELSE jsonb_build_object('tracking', public.sanitize_tracking_consent(payload->'tracking',p_analytics,p_marketing),
        'order', CASE WHEN p_marketing THEN payload->'order' ELSE (payload->'order') - ARRAY['customer_email','customer_phone','customer_name','shipping_address'] END) END,
    -- Invalidating all active leases forces running workers to re-read consent.
    status = 'pending', lease_token = NULL, lease_until = NULL, next_attempt_at = now()
    WHERE owner_hash = p_owner_hash AND status IN ('pending','processing','failed');
  UPDATE public.tracking_outbox SET status = 'suppressed', payload = '{}'::jsonb
    WHERE owner_hash = p_owner_hash AND status = 'pending' AND delivery->>'meta' IN ('sent','skipped') AND delivery->>'ga4' IN ('sent','skipped');
  UPDATE public.orders o SET tracking_outbox_status = q.status FROM public.tracking_outbox q WHERE q.order_id = o.id AND q.owner_hash = p_owner_hash;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.queue_tracking_purchase() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  marketing boolean := coalesce(NEW.tracking #>> '{consent,marketing}', 'false') = 'true';
  analytics boolean := coalesce(NEW.tracking #>> '{consent,analytics}', 'false') = 'true';
  snapshot jsonb;
BEGIN
  IF NEW.payment_status::text IN ('refunded','failed') OR NEW.status::text IN ('cancelled','refunded') THEN
    UPDATE public.tracking_outbox SET status = 'suppressed', lease_token = NULL, lease_until = NULL, payload = '{}'::jsonb
    WHERE order_id = NEW.id AND status IN ('pending','processing','failed');
    UPDATE public.orders SET tracking_outbox_status = 'suppressed'
    WHERE id = NEW.id AND EXISTS (SELECT 1 FROM public.tracking_outbox WHERE order_id = NEW.id AND status = 'suppressed');
    RETURN NEW;
  END IF;
  IF NEW.payment_status::text <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status::text = 'completed' THEN RETURN NEW; END IF;
  END IF;
  IF NOT marketing AND NOT analytics THEN RETURN NEW; END IF;
  snapshot := jsonb_build_object(
    'items', NEW.items, 'shipping_cost', NEW.shipping_cost, 'total', NEW.total,
    'discount_amount', coalesce(to_jsonb(NEW)->'discount_amount', '0'::jsonb));
  IF marketing THEN
    snapshot := snapshot || jsonb_build_object('customer_email', NEW.customer_email, 'customer_phone', NEW.customer_phone, 'customer_name', NEW.customer_name, 'shipping_address', jsonb_build_object('city', NEW.shipping_address->'city', 'zipcode', coalesce(NEW.shipping_address->'zipcode', NEW.shipping_address->'zipCode')));
  END IF;
  INSERT INTO public.tracking_outbox(order_id, owner_hash, event_name, event_id, payload, delivery)
  VALUES(NEW.id, NEW.tracking->>'consent_owner', 'Purchase', NEW.order_number,
    jsonb_build_object('order', snapshot, 'tracking', NEW.tracking),
    jsonb_build_object('meta', CASE WHEN marketing THEN 'pending' ELSE 'skipped' END, 'ga4', CASE WHEN analytics THEN 'pending' ELSE 'skipped' END))
  ON CONFLICT (event_name, event_id) DO NOTHING;
  UPDATE public.orders SET tracking_outbox_status = 'pending' WHERE id = NEW.id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_queue_tracking_purchase ON public.orders;
CREATE TRIGGER orders_queue_tracking_purchase AFTER INSERT OR UPDATE OF payment_status, status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.queue_tracking_purchase();

-- Token must match even if an order_number was supplied. Repeat confirmations preserve
-- fulfillment status and reuse the original purchase row.
CREATE OR REPLACE FUNCTION public.confirm_tracking_payment(p_payment_token text, p_order_number text DEFAULT NULL)
RETURNS SETOF public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE selected_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO selected_order FROM public.orders
  WHERE payment_token = p_payment_token AND (p_order_number IS NULL OR order_number = p_order_number)
  FOR UPDATE;
  IF NOT FOUND OR selected_order.status::text IN ('cancelled','refunded') OR selected_order.payment_status::text IN ('failed','refunded') THEN RETURN; END IF;
  IF selected_order.payment_status::text = 'pending' THEN
    UPDATE public.orders SET payment_status = 'completed', status = 'paid', updated_at = now()
    WHERE id = selected_order.id RETURNING * INTO selected_order;
  END IF;
  IF selected_order.payment_status::text = 'completed' THEN RETURN NEXT selected_order; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.claim_tracking_outbox(p_limit integer DEFAULT 5, p_order_number text DEFAULT NULL)
RETURNS SETOF public.tracking_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Stale final attempts and too-old Meta events are terminal; never retimestamp a sale.
  UPDATE public.tracking_outbox SET status = 'failed', last_error = 'delivery_exhausted', lease_token = NULL, lease_until = NULL
  WHERE status IN ('pending','processing') AND (lease_until IS NULL OR lease_until < now())
    AND (attempts >= 12 OR event_time < extract(epoch FROM now() - interval '72 hours'));
  UPDATE public.orders o SET tracking_outbox_status = 'failed'
  WHERE o.tracking_outbox_status IS DISTINCT FROM 'failed'
    AND EXISTS (SELECT 1 FROM public.tracking_outbox q WHERE q.order_id = o.id AND q.status = 'failed');
  -- Failed payloads are kept briefly for inspection/retry; erase identifiers after seven days.
  UPDATE public.tracking_outbox SET payload = '{}'::jsonb
    WHERE status IN ('failed','suppressed') AND created_at < now() - interval '7 days' AND payload <> '{}'::jsonb;
  DELETE FROM public.tracking_outbox WHERE order_id IS NULL AND status IN ('sent','failed','suppressed') AND created_at < now() - interval '30 days';
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.tracking_outbox
    WHERE ((status = 'pending' AND next_attempt_at <= now()) OR (status = 'processing' AND lease_until < now()))
      AND attempts < 12 AND (p_order_number IS NULL OR (event_name = 'Purchase' AND event_id = p_order_number))
    ORDER BY CASE WHEN event_name = 'Purchase' THEN 0 ELSE 1 END, next_attempt_at
    LIMIT greatest(1, least(p_limit, 10)) FOR UPDATE SKIP LOCKED
  ) UPDATE public.tracking_outbox q
    SET status = 'processing', attempts = q.attempts + 1, lease_token = gen_random_uuid(), lease_until = now() + interval '3 minutes'
    FROM candidates WHERE q.id = candidates.id RETURNING q.*;
END $$;

CREATE OR REPLACE FUNCTION public.finish_tracking_outbox(p_id uuid, p_lease_token uuid, p_status text, p_delivery jsonb, p_error text, p_retry_seconds integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE finished public.tracking_outbox%ROWTYPE;
BEGIN
  IF p_status NOT IN ('pending','sent','failed','suppressed') THEN RAISE EXCEPTION 'Invalid tracking status'; END IF;
  UPDATE public.tracking_outbox SET status = p_status, delivery = p_delivery, last_error = left(p_error,128),
    next_attempt_at = now() + greatest(30,least(p_retry_seconds,21600)) * interval '1 second',
    sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END,
    lease_token = NULL, lease_until = NULL,
    -- Erase identifiers from terminal browser events and settled purchase snapshots.
    payload = CASE WHEN p_status IN ('sent','suppressed') THEN '{}'::jsonb ELSE payload END
    WHERE id = p_id AND lease_token = p_lease_token AND status = 'processing' RETURNING * INTO finished;
  IF FOUND AND finished.order_id IS NOT NULL THEN
    UPDATE public.orders SET tracking_outbox_status = p_status,
      meta_purchase_sent_at = CASE WHEN p_delivery->>'meta' = 'sent' THEN coalesce(meta_purchase_sent_at, now()) ELSE meta_purchase_sent_at END
    WHERE id = finished.order_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.queue_tracking_purchase() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sanitize_tracking_consent(jsonb,boolean,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_tracking_owner_consent() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_tracking_browser(text,bigint,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_tracking_consent(text,bigint,boolean,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_tracking_payment(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_tracking_outbox(integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_tracking_outbox(uuid,uuid,text,jsonb,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_tracking_payment(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_tracking_browser(text,bigint,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_tracking_consent(text,bigint,boolean,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_tracking_outbox(integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_tracking_outbox(uuid,uuid,text,jsonb,text,integer) TO service_role;
COMMIT;
