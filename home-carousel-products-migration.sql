-- Ana sayfa "Urunler" slideri icin yonetilebilir urun listesi
CREATE TABLE IF NOT EXISTS public.home_carousel_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ayni urun birden fazla kez eklenmesin
CREATE UNIQUE INDEX IF NOT EXISTS idx_home_carousel_products_product_id
  ON public.home_carousel_products(product_id);

-- Sirali listeleme performansi
CREATE INDEX IF NOT EXISTS idx_home_carousel_products_order
  ON public.home_carousel_products(display_order, created_at);

