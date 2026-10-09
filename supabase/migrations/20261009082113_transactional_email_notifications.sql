-- Notifications only; no order, payment, or authentication state changes.
CREATE TABLE public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('order_confirmation','admin_order','shipping','admin_signup','welcome','setup_test')),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','suppressed')),
  attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  first_attempt_at timestamptz, lease_until timestamptz, lease_token uuid,
  provider_id text, last_error text, created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.email_notifications TO service_role;
CREATE INDEX email_notifications_due ON public.email_notifications(next_attempt_at) WHERE status IN ('pending','processing');

CREATE FUNCTION public.queue_order_email_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE details jsonb; paid_transition boolean; shipped_transition boolean;
BEGIN
  IF NEW.payment_status::text <> 'completed' OR NEW.status::text IN ('cancelled','refunded') THEN RETURN NEW; END IF;
  paid_transition := TG_OP = 'INSERT';
  shipped_transition := NEW.status::text = 'shipped';
  IF TG_OP = 'UPDATE' THEN
    paid_transition := OLD.payment_status::text <> 'completed';
    shipped_transition := NEW.status::text = 'shipped' AND
      (OLD.status::text <> 'shipped' OR OLD.payment_status::text <> 'completed' OR
       OLD.tracking_number IS DISTINCT FROM NEW.tracking_number OR OLD.carrier IS DISTINCT FROM NEW.carrier);
  END IF;
  details := jsonb_build_object('customerName',NEW.customer_name,'email',NEW.customer_email,
    'orderNumber',NEW.order_number,'items',NEW.items,'subtotal',NEW.subtotal,
    'shippingCost',NEW.shipping_cost,'total',NEW.total,'address',NEW.shipping_address,
    'carrier',NEW.carrier,'trackingNumber',NEW.tracking_number);
  IF paid_transition THEN
    INSERT INTO public.email_notifications(event_key,kind,order_id,payload) VALUES
      ('order_confirmation/'||NEW.id,'order_confirmation',NEW.id,details),
      ('admin_order/'||NEW.id,'admin_order',NEW.id,details) ON CONFLICT(event_key) DO NOTHING;
  END IF;
  IF shipped_transition THEN
    INSERT INTO public.email_notifications(event_key,kind,order_id,payload)
      VALUES ('shipping/'||NEW.id||'/'||md5(coalesce(NEW.carrier,'')||chr(31)||coalesce(NEW.tracking_number,'')),
        'shipping',NEW.id,details) ON CONFLICT(event_key) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Order email enqueue failed: %', SQLSTATE;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_order_email_notifications() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER queue_order_email_notifications AFTER INSERT OR UPDATE OF payment_status,status,carrier,tracking_number ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.queue_order_email_notifications();

CREATE FUNCTION public.queue_registration_email_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE details jsonb; confirmed_transition boolean;
BEGIN
  IF NEW.email IS NULL OR coalesce(NEW.is_anonymous,false) THEN RETURN NEW; END IF;
  details := jsonb_build_object('customerName',coalesce(NEW.raw_user_meta_data->>'name',''),'email',NEW.email);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.email_notifications(event_key,kind,user_id,payload)
      VALUES ('admin_signup/'||NEW.id,'admin_signup',NEW.id,details) ON CONFLICT(event_key) DO NOTHING;
  END IF;
  confirmed_transition := NEW.email_confirmed_at IS NOT NULL;
  IF TG_OP = 'UPDATE' THEN confirmed_transition := OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL; END IF;
  IF confirmed_transition THEN
    INSERT INTO public.email_notifications(event_key,kind,user_id,payload)
      VALUES ('welcome/'||NEW.id,'welcome',NEW.id,details) ON CONFLICT(event_key) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Registration email enqueue failed: %', SQLSTATE;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_registration_email_notifications() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER queue_registration_email_notifications AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.queue_registration_email_notifications();

CREATE FUNCTION public.claim_email_notifications(p_limit integer DEFAULT 4,p_order_id uuid DEFAULT NULL)
RETURNS SETOF public.email_notifications LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.email_notifications SET status='failed',last_error='retry_window_expired',lease_until=NULL,lease_token=NULL
    WHERE status IN ('pending','processing') AND (lease_until IS NULL OR lease_until<now())
      AND (attempts>=8 OR first_attempt_at<now()-interval '23 hours');
  RETURN QUERY WITH candidates AS (
    SELECT id FROM public.email_notifications WHERE status IN ('pending','processing') AND next_attempt_at<=now()
      AND (lease_until IS NULL OR lease_until<now()) AND (p_order_id IS NULL OR order_id=p_order_id)
    ORDER BY next_attempt_at,created_at LIMIT greatest(1,least(p_limit,4)) FOR UPDATE SKIP LOCKED
  ) UPDATE public.email_notifications n SET status='processing',attempts=n.attempts+1,
      first_attempt_at=coalesce(n.first_attempt_at,now()),lease_until=now()+interval '3 minutes',
      lease_token=gen_random_uuid(),next_attempt_at=now()+least(1800,60*power(2,least(n.attempts,5)))*interval '1 second'
    FROM candidates WHERE n.id=candidates.id RETURNING n.*;
END $$;
CREATE FUNCTION public.finish_email_notification(p_id uuid,p_lease_token uuid,p_provider_id text DEFAULT NULL,
  p_error text DEFAULT NULL,p_retry boolean DEFAULT false,p_suppressed boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.email_notifications SET
    status=CASE WHEN p_suppressed THEN 'suppressed' WHEN p_provider_id IS NOT NULL THEN 'sent'
      WHEN p_retry AND attempts<8 THEN 'pending' ELSE 'failed' END,
    provider_id=p_provider_id,last_error=p_error,sent_at=CASE WHEN p_provider_id IS NOT NULL THEN now() ELSE NULL END,
    lease_until=NULL,lease_token=NULL WHERE id=p_id AND lease_token=p_lease_token AND status='processing';
  GET DIAGNOSTICS affected=ROW_COUNT; RETURN affected=1;
END $$;
REVOKE ALL ON FUNCTION public.claim_email_notifications(integer,uuid),public.finish_email_notification(uuid,uuid,text,text,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_notifications(integer,uuid),public.finish_email_notification(uuid,uuid,text,text,boolean,boolean) TO service_role;
