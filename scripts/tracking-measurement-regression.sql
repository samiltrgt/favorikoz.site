-- Run in a staging Supabase SQL editor AFTER tracking-measurement-v4.sql.
-- Exercises real constraints, trigger/RPC atomicity, leases, retry checkpoints,
-- role privileges and cancelled suppression. All fixture changes roll back.
BEGIN;
DO $$
DECLARE
  fixture_id uuid := gen_random_uuid();
  fixture_number text := 'tracking-regression-' || fixture_id::text;
  fixture_token text := 'tracking-test-token-' || fixture_id::text;
  result_count integer;
  claimed public.tracking_outbox%ROWTYPE;
  current_status text;
  owner text := repeat('a',64);
  other_owner text := repeat('b',64);
  fixture_payload jsonb;
  accepted boolean;
BEGIN
  IF has_table_privilege('anon', 'public.tracking_outbox', 'INSERT') OR has_table_privilege('authenticated', 'public.tracking_outbox', 'SELECT') THEN
    RAISE EXCEPTION 'Outbox privileges must be service-role only';
  END IF;
  IF has_function_privilege('authenticated', 'public.confirm_tracking_payment(text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Customers must not invoke payment confirmation';
  END IF;
  IF has_table_privilege('anon','public.tracking_consent','SELECT') OR has_function_privilege('authenticated','public.update_tracking_consent(text,bigint,boolean,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Consent owner state privileges must be service-role only';
  END IF;
  IF has_table_privilege('authenticated', 'public.orders', 'UPDATE') THEN
    RAISE EXCEPTION 'Customers must not self-confirm orders';
  END IF;
  INSERT INTO public.orders(id, order_number, customer_name, customer_email, shipping_address, items, subtotal, shipping_cost, total, status, payment_method, payment_status, payment_token, tracking)
  VALUES(fixture_id, fixture_number, 'Tracking Test', 'tracking@example.invalid', '{}'::jsonb,
    '[{"product_id":"tracking-test-item","price":10000,"quantity":1}]'::jsonb,
    10000, 0, 10000, 'pending', 'credit_card', 'pending', fixture_token,
    jsonb_build_object('consent',jsonb_build_object('analytics',true,'marketing',true),'client_id','123.456','consent_owner',owner,'consent_version',1000,'fbp','fb.1.1700000000000.123'));
  SELECT count(*) INTO result_count FROM public.tracking_outbox WHERE order_id = fixture_id;
  IF result_count <> 0 THEN RAISE EXCEPTION 'Pending payment queued a Purchase'; END IF;
  SELECT count(*) INTO result_count FROM public.confirm_tracking_payment(fixture_token, fixture_number || '-wrong');
  IF result_count <> 0 THEN RAISE EXCEPTION 'Wrong order/token pair confirmed'; END IF;
  SELECT count(*) INTO result_count FROM public.confirm_tracking_payment(fixture_token, fixture_number);
  IF result_count <> 1 THEN RAISE EXCEPTION 'Valid payment did not confirm'; END IF;
  SELECT count(*) INTO result_count FROM public.tracking_outbox WHERE order_id = fixture_id AND event_id = fixture_number;
  IF result_count <> 1 THEN RAISE EXCEPTION 'Paid transition failed atomic enqueue'; END IF;
  UPDATE public.orders SET status = 'shipped' WHERE id = fixture_id;
  PERFORM public.confirm_tracking_payment(fixture_token, fixture_number);
  SELECT status::text INTO current_status FROM public.orders WHERE id = fixture_id;
  IF current_status <> 'shipped' THEN RAISE EXCEPTION 'Repeated confirmation reset fulfillment'; END IF;
  SELECT count(*) INTO result_count FROM public.tracking_outbox WHERE order_id = fixture_id;
  IF result_count <> 1 THEN RAISE EXCEPTION 'Repeated confirmation duplicated Purchase'; END IF;

  SELECT * INTO claimed FROM public.claim_tracking_outbox(1, fixture_number);
  IF claimed.id IS NULL OR claimed.attempts <> 1 OR claimed.lease_token IS NULL THEN RAISE EXCEPTION 'Lease claim failed'; END IF;
  SELECT count(*) INTO result_count FROM public.claim_tracking_outbox(1, fixture_number);
  IF result_count <> 0 THEN RAISE EXCEPTION 'Concurrent worker acquired an active lease'; END IF;
  PERFORM public.finish_tracking_outbox(claimed.id, gen_random_uuid(), 'sent', '{"meta":"sent","ga4":"sent"}'::jsonb, NULL, 30);
  SELECT status INTO current_status FROM public.tracking_outbox WHERE id = claimed.id;
  IF current_status <> 'processing' THEN RAISE EXCEPTION 'Wrong lease released another worker'; END IF;
  PERFORM public.finish_tracking_outbox(claimed.id, claimed.lease_token, 'pending', '{"meta":"sent","ga4":"pending"}'::jsonb, 'ga4_http_503', 30);
  UPDATE public.tracking_outbox SET next_attempt_at = now() WHERE id = claimed.id;
  SELECT * INTO claimed FROM public.claim_tracking_outbox(1, fixture_number);
  IF claimed.attempts <> 2 OR claimed.delivery->>'meta' <> 'sent' THEN RAISE EXCEPTION 'Retry lost platform checkpoint'; END IF;
  UPDATE public.orders SET status = 'cancelled' WHERE id = fixture_id;
  SELECT status INTO current_status FROM public.tracking_outbox WHERE id = claimed.id;
  IF current_status <> 'suppressed' THEN RAISE EXCEPTION 'Cancellation did not suppress queued purchase'; END IF;
  PERFORM public.finish_tracking_outbox(claimed.id, claimed.lease_token, 'sent', '{"meta":"sent","ga4":"sent"}'::jsonb, NULL, 30);
  SELECT status INTO current_status FROM public.tracking_outbox WHERE id = claimed.id;
  IF current_status <> 'suppressed' THEN RAISE EXCEPTION 'Stale worker revived cancelled purchase'; END IF;
  SELECT count(*) INTO result_count FROM public.confirm_tracking_payment(fixture_token, fixture_number);
  IF result_count <> 0 THEN RAISE EXCEPTION 'Cancelled order reconfirmed'; END IF;

  -- Separate fixture: revoke marketing during a queued paid retry, preserve GA4.
  fixture_id := gen_random_uuid(); fixture_number := 'consent-regression-' || fixture_id::text;
  INSERT INTO public.orders(id,order_number,customer_name,customer_email,customer_phone,shipping_address,items,subtotal,shipping_cost,total,status,payment_method,payment_status,tracking)
    VALUES(fixture_id,fixture_number,'Consent Test','consent@example.invalid','+905321112233','{}','[]',10000,0,10000,'paid','credit_card','completed',
      jsonb_build_object('consent',jsonb_build_object('analytics',true,'marketing',true),'client_id','123.456','consent_owner',owner,'consent_version',1000,'fbp','fb.1.1700000000000.123','ip','1.2.3.4'));
  SELECT * INTO claimed FROM public.claim_tracking_outbox(1,fixture_number);
  PERFORM public.update_tracking_consent(other_owner,1001,false,false);
  SELECT payload INTO fixture_payload FROM public.tracking_outbox WHERE id = claimed.id;
  IF fixture_payload #>> '{tracking,consent,marketing}' <> 'true' THEN RAISE EXCEPTION 'Wrong owner revoked another customer'; END IF;
  PERFORM public.update_tracking_consent(owner,1001,true,false);
  SELECT * INTO claimed FROM public.tracking_outbox WHERE id = claimed.id;
  IF claimed.status <> 'pending' OR claimed.lease_token IS NOT NULL OR claimed.delivery->>'meta' <> 'skipped' OR claimed.delivery->>'ga4' <> 'pending' THEN RAISE EXCEPTION 'Partial marketing withdrawal failed channel isolation'; END IF;
  IF claimed.payload #> '{order}' ? 'customer_email' OR claimed.payload #> '{tracking}' ? 'fbp' OR claimed.payload #> '{tracking}' ? 'ip' THEN RAISE EXCEPTION 'Marketing withdrawal retained queued personal identifiers'; END IF;
  IF claimed.payload #>> '{tracking,client_id}' <> '123.456' THEN RAISE EXCEPTION 'Marketing withdrawal erased retained analytics ID'; END IF;
  SELECT tracking INTO fixture_payload FROM public.orders WHERE id = fixture_id;
  IF fixture_payload #>> '{consent,marketing}' <> 'false' OR fixture_payload ? 'fbp' THEN RAISE EXCEPTION 'Marketing withdrawal did not sanitize order capture'; END IF;
  -- Stale explicit grant cannot overwrite a newer deny, including equal-version replay.
  SELECT public.update_tracking_consent(owner,1000,true,true) INTO accepted;
  IF accepted THEN RAISE EXCEPTION 'Stale explicit grant reinstated denied owner'; END IF;
  SELECT public.update_tracking_consent(owner,1001,true,true) INTO accepted;
  IF accepted THEN RAISE EXCEPTION 'Equal-version replay changed consent'; END IF;
  SELECT public.enqueue_tracking_browser(owner,1000,'{"analytics":true,"marketing":true}',jsonb_build_object('event_name','ViewContent','event_id',fixture_number || '-stale','event_time',extract(epoch FROM now())::bigint,'user_data',jsonb_build_object('fbp','old'))) INTO accepted;
  IF accepted THEN RAISE EXCEPTION 'Stale browser event reinstated revoked consent'; END IF;
  PERFORM public.update_tracking_consent(owner,1002,false,false);
  SELECT * INTO claimed FROM public.tracking_outbox WHERE id = claimed.id;
  IF claimed.status <> 'suppressed' OR claimed.payload <> '{}'::jsonb THEN RAISE EXCEPTION 'Full withdrawal did not suppress and erase queued purchase'; END IF;
  -- A delayed payment creation with stale consent must not restore JSON or flat IDs.
  INSERT INTO public.orders(id,order_number,customer_name,customer_email,shipping_address,items,subtotal,shipping_cost,total,status,payment_method,payment_status,tracking,fbp,gclid,client_ip)
    VALUES(gen_random_uuid(),fixture_number || '-stale-order','Stale Test','stale@example.invalid','{}','[]',10000,0,10000,'paid','credit_card','completed',
      jsonb_build_object('consent',jsonb_build_object('analytics',true,'marketing',true),'client_id','123.456','consent_owner',owner,'consent_version',1000,'fbp','fb.1.1700000000000.123','ip','1.2.3.4'),
      'fb.1.1700000000000.123','stale-click','1.2.3.4');
  SELECT count(*) INTO result_count FROM public.orders WHERE order_number = fixture_number || '-stale-order'
    AND (tracking ? 'fbp' OR tracking ? 'ip' OR tracking ? 'client_id' OR fbp IS NOT NULL OR gclid IS NOT NULL OR client_ip IS NOT NULL);
  IF result_count <> 0 THEN RAISE EXCEPTION 'Stale payment repersisted revoked identifiers'; END IF;
  SELECT count(*) INTO result_count FROM public.tracking_outbox WHERE event_id = fixture_number || '-stale-order';
  IF result_count <> 0 THEN RAISE EXCEPTION 'Stale denied payment queued a purchase'; END IF;
  PERFORM public.update_tracking_consent(owner,1003,true,true);
  SELECT * INTO claimed FROM public.tracking_outbox WHERE id = claimed.id;
  IF claimed.status <> 'suppressed' THEN RAISE EXCEPTION 'Regrant revived previously suppressed purchase'; END IF;
  SELECT public.enqueue_tracking_browser(owner,1000,'{"analytics":true,"marketing":true}',jsonb_build_object('event_name','ViewContent','event_id',fixture_number || '-stale-after-regrant','event_time',extract(epoch FROM now())::bigint,'user_data',jsonb_build_object('fbp','old'))) INTO accepted;
  IF accepted THEN RAISE EXCEPTION 'Stale pre-withdrawal event was accepted after regrant'; END IF;
  INSERT INTO public.orders(id,order_number,customer_name,customer_email,shipping_address,items,subtotal,shipping_cost,total,status,payment_method,payment_status,tracking,fbp,gclid,client_ip)
    VALUES(gen_random_uuid(),fixture_number || '-stale-after-regrant','Delayed Test','delayed@example.invalid','{}','[]',10000,0,10000,'paid','credit_card','completed',
      jsonb_build_object('consent',jsonb_build_object('analytics',true,'marketing',true),'client_id','123.456','consent_owner',owner,'consent_version',1000,'fbp','fb.1.1700000000000.123','ip','1.2.3.4'),
      'fb.1.1700000000000.123','stale-click','1.2.3.4');
  SELECT count(*) INTO result_count FROM public.orders WHERE order_number = fixture_number || '-stale-after-regrant'
    AND (tracking ? 'fbp' OR tracking ? 'ip' OR tracking ? 'client_id' OR fbp IS NOT NULL OR gclid IS NOT NULL OR client_ip IS NOT NULL);
  IF result_count <> 0 THEN RAISE EXCEPTION 'Delayed payment repersisted old identifiers after regrant'; END IF;
  SELECT count(*) INTO result_count FROM public.tracking_outbox WHERE event_id = fixture_number || '-stale-after-regrant';
  IF result_count <> 0 THEN RAISE EXCEPTION 'Delayed old payment queued a purchase after regrant'; END IF;
  SELECT public.enqueue_tracking_browser(owner,1003,'{"analytics":true,"marketing":true}',jsonb_build_object('event_name','PageView','event_id',fixture_number || '-anon','event_time',extract(epoch FROM now())::bigint,'user_data',jsonb_build_object('fbp','approved'))) INTO accepted;
  IF NOT accepted THEN RAISE EXCEPTION 'Current owner consent failed anonymous event enqueue'; END IF;
  PERFORM public.update_tracking_consent(owner,1004,false,true);
  SELECT payload INTO fixture_payload FROM public.tracking_outbox WHERE event_id = fixture_number || '-anon';
  IF NOT fixture_payload ? 'meta' THEN RAISE EXCEPTION 'Analytics-only withdrawal erased retained Meta event'; END IF;
  PERFORM public.update_tracking_consent(owner,1005,false,false);
  SELECT status,payload INTO current_status,fixture_payload FROM public.tracking_outbox WHERE event_id = fixture_number || '-anon';
  IF current_status <> 'suppressed' OR fixture_payload <> '{}'::jsonb THEN RAISE EXCEPTION 'Anonymous owner withdrawal did not suppress Meta'; END IF;
END $$;
ROLLBACK;
