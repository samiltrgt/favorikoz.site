-- Optional recommended minute-by-minute delivery. Apply AFTER measurement migration.
-- Before running, save two secrets in Supabase Vault:
-- tracking_cron_url: https://YOUR-PRODUCTION-DOMAIN/api/cron/tracking
-- tracking_cron_secret: same value as CRON_SECRET on Vercel (never NEXT_PUBLIC).
-- The repository stores neither value. Vercel daily cron is a fallback only.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'tracking_cron_url')
    OR NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'tracking_cron_secret') THEN
    RAISE EXCEPTION 'Configure tracking_cron_url and tracking_cron_secret in Supabase Vault first';
  END IF;
END $$;

SELECT cron.schedule('favorikoz-tracking-outbox', '* * * * *', $job$
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'tracking_cron_url' LIMIT 1),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'tracking_cron_secret' LIMIT 1)
    ),
    timeout_milliseconds := 60000
  );
$job$);
