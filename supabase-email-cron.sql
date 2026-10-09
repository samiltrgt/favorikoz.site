-- Run only after the email worker deployment is live.
-- Reuse the existing cron authentication; never embed a secret in the command.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name='tracking_cron_secret') OR
    NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name='tracking_cron_url'
      AND decrypted_secret ~ '^https://[^/]+/api/cron/tracking(\?.*)?$') THEN
    RAISE EXCEPTION 'Existing cron URL and secret must be configured first';
  END IF;
END $$;
SELECT cron.schedule('favorikoz-email-notifications','* * * * *',$job$
  SELECT net.http_get(
    url := replace((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='tracking_cron_url'),'/api/cron/tracking','/api/cron/emails'),
    headers := jsonb_build_object('Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='tracking_cron_secret')),
    timeout_milliseconds := 60000
  );
$job$);
