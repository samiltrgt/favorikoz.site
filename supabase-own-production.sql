-- Own Production / Exclusive Collection section - Admin seçimli anasayfa bölümü
-- Supabase SQL Editor'da çalıştırın.

CREATE TABLE IF NOT EXISTS public.own_production_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_own_production_active ON public.own_production_products (is_active, display_order);

ALTER TABLE public.own_production_products ENABLE ROW LEVEL SECURITY;

-- Herkes aktif kayıtları okuyabilsin (anasayfa için)
DROP POLICY IF EXISTS "own_production_public_read" ON public.own_production_products;
CREATE POLICY "own_production_public_read" ON public.own_production_products
  FOR SELECT USING (is_active = TRUE);

-- Sadece admin ekleyebilsin/silebilsin
DROP POLICY IF EXISTS "own_production_admin_all" ON public.own_production_products;
CREATE POLICY "own_production_admin_all" ON public.own_production_products
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
