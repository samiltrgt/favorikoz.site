-- ============================================
-- SUPABASE STORAGE BUCKET FIX
-- Bu script'i Supabase SQL Editor'da çalıştır
-- ============================================

-- 1. Önce mevcut bucket'ları kontrol et ve 'images' bucket'ını oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

-- 2. Eski RLS politikalarını temizle
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "images_admin_upload" ON storage.objects;
DROP POLICY IF EXISTS "images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "images_admin_delete" ON storage.objects;

-- 3. Public read policy (herkes okuyabilsin)
CREATE POLICY "images_public_read" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'images');

-- 4. Admin upload policy (service role ile upload için)
-- Service role kullanıldığında RLS bypass edilir, ama yine de policy ekleyelim
CREATE POLICY "images_admin_upload" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'images'
  );

-- 5. Admin update policy
CREATE POLICY "images_admin_update" ON storage.objects
  FOR UPDATE 
  USING (bucket_id = 'images')
  WITH CHECK (bucket_id = 'images');

-- 6. Admin delete policy
CREATE POLICY "images_admin_delete" ON storage.objects
  FOR DELETE 
  USING (bucket_id = 'images');

-- 7. Bucket'ın varlığını kontrol et
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'images';

-- 8. Mevcut dosyaları kontrol et (varsa)
SELECT 
  name,
  bucket_id,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'images'
ORDER BY created_at DESC
LIMIT 10;

