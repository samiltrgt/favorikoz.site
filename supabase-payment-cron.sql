-- Optional frequent reconciliation; daily Vercel cron is only a fallback.
-- Vault payments_cron_url = https://YOUR-DOMAIN/api/cron/payments
-- Reuses tracking_cron_secret = the server CRON_SECRET (never public).
-- Derive the payment endpoint from the existing, working tracking endpoint.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
DO $$
DECLARE tracking_url text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'tracking_cron_secret') THEN
    RAISE EXCEPTION 'Configure tracking_cron_secret in Vault first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'payments_cron_url') THEN
    SELECT decrypted_secret INTO tracking_url FROM vault.decrypted_secrets WHERE name = 'tracking_cron_url';
    IF tracking_url IS NULL OR tracking_url !~ '^https://[^/]+/api/cron/tracking(\?.*)?$' THEN
      RAISE EXCEPTION 'Configure a valid tracking_cron_url or payments_cron_url in Vault first';
    END IF;
    PERFORM vault.create_secret(replace(tracking_url, '/api/cron/tracking', '/api/cron/payments'), 'payments_cron_url');
  END IF;
END $$;
SELECT cron.schedule('favorikoz-payment-reconciliation', '*/5 * * * *', $job$
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'payments_cron_url' LIMIT 1),
    headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'tracking_cron_secret' LIMIT 1)),
    timeout_milliseconds := 60000
  );
$job$);
