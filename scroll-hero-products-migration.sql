-- Scroll Hero kartlarinda gosterilecek urunler icin tablo
CREATE TABLE IF NOT EXISTS public.scroll_hero_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eski kurulumlarda product_id NOT NULL ise gevset
ALTER TABLE public.scroll_hero_products
  ALTER COLUMN product_id DROP NOT NULL;

-- Eski kurulumlarda image_url kolonu yoksa ekle
ALTER TABLE public.scroll_hero_products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- En az bir kaynak zorunlu: urun veya manuel gorsel URL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scroll_hero_products_source_check'
  ) THEN
    ALTER TABLE public.scroll_hero_products
      ADD CONSTRAINT scroll_hero_products_source_check
      CHECK (product_id IS NOT NULL OR image_url IS NOT NULL);
  END IF;
END $$;

-- Ayni urun birden fazla kez eklenmesin (yalniz product_id dolu satirlarda)
CREATE UNIQUE INDEX IF NOT EXISTS idx_scroll_hero_products_product_id
  ON public.scroll_hero_products(product_id)
  WHERE product_id IS NOT NULL;

-- Sirali listeleme icin hizlandirma
CREATE INDEX IF NOT EXISTS idx_scroll_hero_products_order
  ON public.scroll_hero_products(display_order, created_at);

