-- ============================================
-- KATEGORİ TEMİZLEME SCRIPTİ
-- Version: 1.0
-- Date: 2025-01-21
-- ============================================
-- Bu script, belirtilen 5 ana kategori ve alt kategorileri haricindeki
-- tüm kategorileri siler (soft delete)

-- İzin verilen ana kategoriler
-- 1. tirnak
-- 2. sac-bakimi
-- 3. kisisel-bakim
-- 4. ipek-kirpik
-- 5. kuafor-malzemeleri

-- İzin verilen alt kategoriler
-- Tırnak alt kategorileri:
-- - jeller
-- - cihazlar
-- - freze-uclari
-- - kalici-oje
-- - protez-tirnak-malzemeleri

-- Saç Bakımı alt kategorileri:
-- - sac-bakim
-- - sac-topik
-- - sac-sekillendiriciler
-- - sac-fircasi-ve-tarak

-- Kişisel Bakım alt kategorileri:
-- - kisisel-bakim-alt
-- - cilt-bakimi

-- İpek Kirpik alt kategorileri:
-- - ipek-kirpikler
-- - diger-ipek-kirpik-urunleri

-- Kuaför Malzemeleri alt kategorileri:
-- - tiras-makineleri
-- - fon-makineleri
-- - diger-kuafor-malzemeleri

-- İzin verilen kategoriler listesi
WITH allowed_categories AS (
  SELECT slug FROM (VALUES
    -- Ana kategoriler
    ('tirnak'),
    ('sac-bakimi'),
    ('kisisel-bakim'),
    ('ipek-kirpik'),
    ('kuafor-malzemeleri'),
    -- Alt kategoriler
    ('jeller'),
    ('cihazlar'),
    ('freze-uclari'),
    ('kalici-oje'),
    ('protez-tirnak-malzemeleri'),
    ('sac-bakim'),
    ('sac-topik'),
    ('sac-sekillendiriciler'),
    ('sac-fircasi-ve-tarak'),
    ('kisisel-bakim-alt'),
    ('cilt-bakimi'),
    ('ipek-kirpikler'),
    ('diger-ipek-kirpik-urunleri'),
    ('tiras-makineleri'),
    ('fon-makineleri'),
    ('diger-kuafor-malzemeleri')
  ) AS t(slug)
)
-- İzin verilmeyen kategorileri soft delete yap
UPDATE public.categories
SET deleted_at = NOW()
WHERE slug NOT IN (SELECT slug FROM allowed_categories)
  AND deleted_at IS NULL;

-- Sonuç kontrolü
SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_categories,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_categories,
  COUNT(*) as total_categories
FROM public.categories;

