-- ============================================
-- ALT KATEGORİLER MİGRATİON
-- Version: 1.1
-- Date: 2025-01-21
-- ============================================

-- 1. Categories tablosuna parent_id ekle
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_slug TEXT REFERENCES public.categories(slug) ON DELETE CASCADE;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories (parent_slug);

-- 2. Ana kategorileri ekle (eğer yoksa)
INSERT INTO public.categories (slug, name, description, created_at, updated_at)
VALUES 
  ('tirnak', 'Tırnak', 'Tırnak bakım ve protez tırnak ürünleri', NOW(), NOW()),
  ('sac-bakimi', 'Saç Bakımı', 'Saç bakım ve şekillendirme ürünleri', NOW(), NOW()),
  ('kisisel-bakim', 'Kişisel Bakım', 'Kişisel bakım ve cilt bakım ürünleri', NOW(), NOW()),
  ('ipek-kirpik', 'İpek Kirpik', 'İpek kirpik ürünleri', NOW(), NOW()),
  ('kuafor-malzemeleri', 'Kuaför Malzemeleri', 'Kuaför ve güzellik merkezi malzemeleri', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 3. Alt kategorileri ekle
-- Tırnak alt kategorileri
INSERT INTO public.categories (slug, name, parent_slug, description, created_at, updated_at)
VALUES 
  ('jeller', 'Jeller', 'tirnak', 'Tırnak jelleri ve jel sistemleri', NOW(), NOW()),
  ('cihazlar', 'Cihazlar', 'tirnak', 'Tırnak bakım cihazları', NOW(), NOW()),
  ('freze-uclari', 'Freze Uçları', 'tirnak', 'Freze uçları ve aksesuarları', NOW(), NOW()),
  ('kalici-oje', 'Kalıcı Oje', 'tirnak', 'Kalıcı oje ürünleri', NOW(), NOW()),
  ('protez-tirnak-malzemeleri', 'Protez Tırnak Malzemeleri', 'tirnak', 'Protez tırnak malzemeleri', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Saç Bakımı alt kategorileri
INSERT INTO public.categories (slug, name, parent_slug, description, created_at, updated_at)
VALUES 
  ('sac-bakim', 'Saç Bakım', 'sac-bakimi', 'Saç bakım ürünleri', NOW(), NOW()),
  ('sac-topik', 'Saç Topik', 'sac-bakimi', 'Saç topik ürünleri', NOW(), NOW()),
  ('sac-sekillendiriciler', 'Saç Şekillendiriciler', 'sac-bakimi', 'Saç şekillendirme ürünleri', NOW(), NOW()),
  ('sac-fircasi-ve-tarak', 'Saç Fırçası ve Tarak', 'sac-bakimi', 'Saç fırçası ve tarak ürünleri', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Kişisel Bakım alt kategorileri
INSERT INTO public.categories (slug, name, parent_slug, description, created_at, updated_at)
VALUES 
  ('kisisel-bakim-alt', 'Kişisel Bakım', 'kisisel-bakim', 'Kişisel bakım ürünleri', NOW(), NOW()),
  ('cilt-bakimi', 'Cilt Bakımı', 'kisisel-bakim', 'Cilt bakım ürünleri', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- İpek Kirpik alt kategorileri
INSERT INTO public.categories (slug, name, parent_slug, description, created_at, updated_at)
VALUES 
  ('ipek-kirpikler', 'İpek Kirpikler', 'ipek-kirpik', 'İpek kirpik ürünleri', NOW(), NOW()),
  ('diger-ipek-kirpik-urunleri', 'Diğer İpek Kirpik Ürünleri', 'ipek-kirpik', 'Diğer ipek kirpik ürünleri', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Kuaför Malzemeleri alt kategorileri
INSERT INTO public.categories (slug, name, parent_slug, description, created_at, updated_at)
VALUES 
  ('tiras-makineleri', 'Tıraş Makineleri', 'kuafor-malzemeleri', 'Tıraş makineleri', NOW(), NOW()),
  ('fon-makineleri', 'Fön Makineleri', 'kuafor-malzemeleri', 'Fön makineleri', NOW(), NOW()),
  ('diger-kuafor-malzemeleri', 'Diğer Kuaför Malzemeleri', 'kuafor-malzemeleri', 'Diğer kuaför malzemeleri', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 4. Products tablosuna subcategory_slug ekle (opsiyonel, mevcut ürünler için)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS subcategory_slug TEXT REFERENCES public.categories(slug) ON DELETE SET NULL;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON public.products (subcategory_slug);

