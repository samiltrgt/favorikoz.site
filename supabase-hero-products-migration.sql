-- Hero Products Table for Hero Section Cards
CREATE TABLE IF NOT EXISTS public.hero_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image TEXT NOT NULL,
  link TEXT,
  slide_index INT NOT NULL DEFAULT 0,
  slot_index INT NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hero_products
  ADD COLUMN IF NOT EXISTS slide_index INT NOT NULL DEFAULT 0;

ALTER TABLE public.hero_products
  ADD COLUMN IF NOT EXISTS slot_index INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_hero_products_active ON public.hero_products (is_active, slide_index, slot_index);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hero_products_slot ON public.hero_products (slide_index, slot_index);

-- Enable RLS
ALTER TABLE public.hero_products ENABLE ROW LEVEL SECURITY;

-- Public read for active hero products
CREATE POLICY "Public can view active hero products"
  ON public.hero_products
  FOR SELECT
  USING (is_active = true);

-- Admin can do everything
CREATE POLICY "Admins can manage hero products"
  ON public.hero_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

