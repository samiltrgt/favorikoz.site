-- ============================================
-- MIGRATION: Protez Tırnak -> Tırnak
-- Tarih: 2025-01-21
-- Açıklama: "protez-tirnak" kategorisindeki tüm ürünleri "tirnak" kategorisine taşır
-- ============================================

-- 1. "tirnak" kategorisinin var olduğundan emin ol
INSERT INTO public.categories (slug, name, description, created_at, updated_at)
VALUES ('tirnak', 'Tırnak', 'Tırnak bakımı ve protez tırnak ürünleri', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 2. "protez-tirnak" kategorisindeki tüm ürünleri "tirnak" kategorisine taşı
UPDATE public.products
SET 
  category_slug = 'tirnak',
  updated_at = NOW()
WHERE category_slug = 'protez-tirnak'
  AND deleted_at IS NULL;

-- 3. Güncellenen ürün sayısını göster
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ % ürün "tirnak" kategorisine taşındı', updated_count;
END $$;

-- 4. Kontrol sorgusu - "protez-tirnak" kategorisinde kalan ürün var mı?
SELECT 
  COUNT(*) as remaining_products
FROM public.products
WHERE category_slug = 'protez-tirnak'
  AND deleted_at IS NULL;

-- 5. Kontrol sorgusu - "tirnak" kategorisindeki ürün sayısı
SELECT 
  COUNT(*) as tirnak_products
FROM public.products
WHERE category_slug = 'tirnak'
  AND deleted_at IS NULL;

