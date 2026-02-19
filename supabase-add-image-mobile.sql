-- Mobil banner görseli: promo_banners tablosuna image_mobile sütunu ekler.
-- Supabase SQL Editor'da çalıştırın (sütun zaten varsa hata vermez).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'promo_banners'
      AND column_name = 'image_mobile'
  ) THEN
    ALTER TABLE public.promo_banners
      ADD COLUMN image_mobile TEXT;
  END IF;
END $$;
