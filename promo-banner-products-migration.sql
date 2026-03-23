-- Promo carousel altindaki urunleri banner bazli yonetmek icin
CREATE TABLE IF NOT EXISTS public.promo_banner_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES public.promo_banners(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ayni urun ayni bannera ikinci kez eklenmesin
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_banner_products_banner_product
  ON public.promo_banner_products(banner_id, product_id);

CREATE INDEX IF NOT EXISTS idx_promo_banner_products_order
  ON public.promo_banner_products(banner_id, display_order);

