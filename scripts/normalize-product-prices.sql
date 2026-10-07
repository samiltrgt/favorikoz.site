-- One-time operational conversion: legacy products are TL * 1000; target is kuruş.
-- Run only with checkout/imports paused and coordinated with the new code release.
-- The backup table deliberately has no IF NOT EXISTS: a second run must fail.
BEGIN;
SET LOCAL lock_timeout = '10s';
LOCK TABLE public.products IN ACCESS EXCLUSIVE MODE;
CREATE SCHEMA IF NOT EXISTS pricing_backup;
REVOKE ALL ON SCHEMA pricing_backup FROM PUBLIC, anon, authenticated;
CREATE TABLE pricing_backup.product_prices_kurus_v2 AS
  SELECT id, price, original_price FROM public.products;
ALTER TABLE pricing_backup.product_prices_kurus_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE pricing_backup.product_prices_kurus_v2 FROM PUBLIC, anon, authenticated;
UPDATE public.products SET
  price = ROUND(price::numeric / 10),
  original_price = ROUND(original_price::numeric / 10);
-- Order amounts already use kuruş and must not be converted.
COMMIT;
