-- ============================================
-- FAVORIKOZ SUPABASE MIGRATION
-- Version: 1.0
-- Date: 2025-01-21
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for full-text search

-- ============================================
-- 1. CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_deleted ON public.categories (deleted_at);

-- ============================================
-- 2. PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  price BIGINT NOT NULL,                 -- in kuruş (cents)
  original_price BIGINT,
  discount INT CHECK (discount BETWEEN 0 AND 100),
  image TEXT,
  images TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  reviews_count INT DEFAULT 0,
  is_new BOOLEAN DEFAULT FALSE,
  is_best_seller BOOLEAN DEFAULT FALSE,
  in_stock BOOLEAN DEFAULT TRUE,
  stock_quantity INT DEFAULT 0,
  category_slug TEXT REFERENCES public.categories(slug) ON DELETE SET NULL,
  description TEXT,
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_slug);
CREATE INDEX IF NOT EXISTS idx_products_flags ON public.products (is_new, is_best_seller, in_stock);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON public.products (deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_trgm ON public.products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand);

-- ============================================
-- 3. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('customer','admin','editor')) DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- ============================================
-- 4. ORDERS TABLE
-- ============================================
-- Create enums if they don't exist
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending','paid','shipped','completed','cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending','completed','failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  items JSONB NOT NULL,
  subtotal BIGINT NOT NULL,
  shipping_cost BIGINT NOT NULL,
  total BIGINT NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders (order_number);

-- ============================================
-- 5. FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product ON public.favorites (product_id);

-- ============================================
-- 6. REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews (user_id);

-- ============================================
-- 7. BANNERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image TEXT NOT NULL,
  link TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners (is_active, display_order);

-- ============================================
-- 8. FEATURED PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.featured_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_featured_active ON public.featured_products (is_active, display_order);

-- ============================================
-- RLS (Row Level Security) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_products ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'admin'
  );
$$;

-- ============================================
-- CATEGORIES POLICIES
-- ============================================
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all" ON public.categories
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- PRODUCTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- PROFILES POLICIES
-- ============================================
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- ORDERS POLICIES
-- ============================================
DROP POLICY IF EXISTS "orders_owner_read" ON public.orders;
CREATE POLICY "orders_owner_read" ON public.orders
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "orders_owner_insert" ON public.orders;
CREATE POLICY "orders_owner_insert" ON public.orders
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- FAVORITES POLICIES
-- ============================================
DROP POLICY IF EXISTS "favorites_owner_all" ON public.favorites;
CREATE POLICY "favorites_owner_all" ON public.favorites
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- REVIEWS POLICIES
-- ============================================
DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;
CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "reviews_auth_insert" ON public.reviews;
CREATE POLICY "reviews_auth_insert" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR guest_name IS NOT NULL);

DROP POLICY IF EXISTS "reviews_owner_update" ON public.reviews;
CREATE POLICY "reviews_owner_update" ON public.reviews
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reviews_admin_all" ON public.reviews;
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- BANNERS POLICIES
-- ============================================
DROP POLICY IF EXISTS "banners_public_read" ON public.banners;
CREATE POLICY "banners_public_read" ON public.banners
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "banners_admin_all" ON public.banners;
CREATE POLICY "banners_admin_all" ON public.banners
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- FEATURED PRODUCTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "featured_public_read" ON public.featured_products;
CREATE POLICY "featured_public_read" ON public.featured_products
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "featured_admin_all" ON public.featured_products;
CREATE POLICY "featured_admin_all" ON public.featured_products
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create product images bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Create banners bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Create private bucket (for invoices, etc)
INSERT INTO storage.buckets (id, name, public)
VALUES ('private', 'private', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Public read for product-images and banners
DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images" ON storage.objects
  FOR SELECT USING (bucket_id IN ('product-images', 'banners'));

-- Admin can write to public buckets
DROP POLICY IF EXISTS "admin_write_public_buckets" ON storage.objects;
CREATE POLICY "admin_write_public_buckets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('product-images', 'banners') AND public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "admin_update_public_buckets" ON storage.objects;
CREATE POLICY "admin_update_public_buckets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('product-images', 'banners') AND public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "admin_delete_public_buckets" ON storage.objects;
CREATE POLICY "admin_delete_public_buckets" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('product-images', 'banners') AND public.is_admin(auth.uid())
  );

-- Private bucket: only owner/admin
DROP POLICY IF EXISTS "private_owner_read" ON storage.objects;
CREATE POLICY "private_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'private' AND (owner = auth.uid() OR public.is_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "private_owner_write" ON storage.objects;
CREATE POLICY "private_owner_write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'private' AND (owner = auth.uid() OR public.is_admin(auth.uid()))
  )
  WITH CHECK (
    bucket_id = 'private' AND (owner = auth.uid() OR public.is_admin(auth.uid()))
  );

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_categories ON public.categories;
CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_products ON public.products;
CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_orders ON public.orders;
CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_banners ON public.banners;
CREATE TRIGGER set_updated_at_banners
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default categories
INSERT INTO public.categories (slug, name, description) VALUES
('protez-tirnak', 'Protez Tırnak', 'Profesyonel protez tırnak ürünleri ve ekipmanları'),
('kalici-makyaj', 'Kalıcı Makyaj & Microblading', 'Kalıcı makyaj ve microblading profesyonel ürünleri'),
('ipek-kirpik', 'İpek Kirpik', 'Doğal görünümlü ipek kirpik ürünleri'),
('kisisel-bakim', 'Kişisel Bakım', 'Cilt bakımı ve kişisel bakım ürünleri'),
('makyaj', 'Makyaj', 'Profesyonel makyaj ürünleri ve ekipmanları'),
('sac-bakimi', 'Saç Bakımı', 'Saç bakımı ve şekillendirme ürünleri'),
('erkek-bakim', 'Erkek Bakım', 'Erkek bakım ve tıraş ürünleri'),
('kuafor-guzellik', 'Kuaför & Güzellik Merkezleri', 'Profesyonel kuaför ve güzellik merkezi ekipmanları')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create images bucket for product photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for images bucket
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
CREATE POLICY "images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

DROP POLICY IF EXISTS "images_admin_upload" ON storage.objects;
CREATE POLICY "images_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images' AND 
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "images_admin_update" ON storage.objects;
CREATE POLICY "images_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'images' AND 
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "images_admin_delete" ON storage.objects;
CREATE POLICY "images_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'images' AND 
    public.is_admin(auth.uid())
  );

-- ============================================
-- DONE! Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update .env.local with Supabase credentials
-- 3. Run product migration script: npm run migrate:products
-- 4. Create admin user in Supabase Auth Dashboard
-- 5. Test image upload functionality
-- ============================================

