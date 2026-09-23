-- Supabase SQL Editor'da bir kez çalıştırın.
-- Aynı siparişe iki kez onay maili gitmesini engeller.

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;
