-- Use together with rolling back the code, while checkout/imports are paused.
-- Refuse to overwrite prices changed or products added after conversion.
BEGIN;
SET LOCAL lock_timeout = '10s';
LOCK TABLE public.products IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.products p
    FULL JOIN pricing_backup.product_prices_kurus_v2 b ON p.id = b.id
    WHERE p.id IS NULL OR b.id IS NULL
      OR p.price IS DISTINCT FROM ROUND(b.price::numeric / 10)
      OR p.original_price IS DISTINCT FROM ROUND(b.original_price::numeric / 10)
  ) THEN
    RAISE EXCEPTION 'Product prices changed after conversion; automatic rollback refused';
  END IF;
END $$;
UPDATE public.products p SET price = b.price, original_price = b.original_price
FROM pricing_backup.product_prices_kurus_v2 b WHERE p.id = b.id;
ALTER TABLE pricing_backup.product_prices_kurus_v2 RENAME TO product_prices_kurus_v2_rolled_back;
COMMIT;
