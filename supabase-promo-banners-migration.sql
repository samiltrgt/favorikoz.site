-- Promo Banners Table for Promo Banner Section
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.promo_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '/tum-urunler',
  button_text TEXT NOT NULL DEFAULT 'Tüm Ürünleri Keşfet',
  position TEXT NOT NULL DEFAULT 'top' CHECK (position IN ('top', 'bottom', 'footer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns if they don't exist (safe for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'promo_banners' 
    AND column_name = 'position'
  ) THEN
    ALTER TABLE public.promo_banners ADD COLUMN position TEXT NOT NULL DEFAULT 'top' CHECK (position IN ('top', 'bottom', 'footer'));
  ELSE
    -- Update existing constraint to include 'footer'
    ALTER TABLE public.promo_banners DROP CONSTRAINT IF EXISTS promo_banners_position_check;
    ALTER TABLE public.promo_banners ADD CONSTRAINT promo_banners_position_check CHECK (position IN ('top', 'bottom', 'footer'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promo_banners_position ON public.promo_banners (position, is_active);
CREATE INDEX IF NOT EXISTS idx_promo_banners_active ON public.promo_banners (is_active, display_order);

-- Enable RLS
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Public can view active promo banners" ON public.promo_banners;
DROP POLICY IF EXISTS "Admins can manage promo banners" ON public.promo_banners;

-- Create policies (will only create if they don't exist after DROP)
DO $$
BEGIN
  -- Public read for active promo banners
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'promo_banners' 
    AND policyname = 'Public can view active promo banners'
  ) THEN
    CREATE POLICY "Public can view active promo banners"
      ON public.promo_banners
      FOR SELECT
      USING (is_active = true);
  END IF;

  -- Admin can do everything
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'promo_banners' 
    AND policyname = 'Admins can manage promo banners'
  ) THEN
    CREATE POLICY "Admins can manage promo banners"
      ON public.promo_banners
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'promo_banners'
ORDER BY ordinal_position;

