-- ============================================
-- UNUSED BUCKET CLEANUP
-- Bu script kullanılmayan 'product-images' bucket'ını temizler
-- ============================================

-- Önce bucket'ta dosya var mı kontrol et
SELECT 
  COUNT(*) as file_count,
  bucket_id
FROM storage.objects
WHERE bucket_id = 'product-images'
GROUP BY bucket_id;

-- Eğer dosya yoksa (veya eminsen), bucket'ı silebilirsin
-- DİKKAT: Bu işlem geri alınamaz!
-- Önce yukarıdaki sorguyu çalıştırıp dosya sayısını kontrol et

-- Bucket'ı silmek için (eğer boşsa):
-- DELETE FROM storage.buckets WHERE id = 'product-images';

-- Veya Supabase Dashboard'dan Storage > Buckets > product-images > Delete ile silebilirsin

-- Sadece kontrol için (silmeden önce):
SELECT 
  id,
  name,
  public,
  created_at,
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'product-images') as file_count
FROM storage.buckets
WHERE id = 'product-images';

