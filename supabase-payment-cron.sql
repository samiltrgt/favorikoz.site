-- Optional frequent reconciliation; daily Vercel cron is only a fallback.
-- Vault payments_cron_url = https://YOUR-DOMAIN/api/cron/payments
-- Reuses tracking_cron_secret = the server CRON_SECRET (never public).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'payments_cron_url')
    OR NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'tracking_cron_secret') THEN
    RAISE EXCEPTION 'Configure payments_cron_url and tracking_cron_secret in Vault first';
  END IF;
END $$;
SELECT cron.schedule('favorikoz-payment-reconciliation', '*/5 * * * *', $job$
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'payments_cron_url' LIMIT 1),
    headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'tracking_cron_secret' LIMIT 1)),
    timeout_milliseconds := 60000
  );
$job$);
