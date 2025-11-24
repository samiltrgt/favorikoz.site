-- Hero Products Table Migration (Safe - can run multiple times)
-- Run this in Supabase SQL Editor - it's safe to run even if table/columns exist

-- Create table if it doesn't exist
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

-- Add columns if they don't exist (safe for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hero_products' 
    AND column_name = 'slide_index'
  ) THEN
    ALTER TABLE public.hero_products ADD COLUMN slide_index INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hero_products' 
    AND column_name = 'slot_index'
  ) THEN
    ALTER TABLE public.hero_products ADD COLUMN slot_index INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Update existing records to have default values (if any null values exist)
UPDATE public.hero_products
SET slide_index = COALESCE(slide_index, 0),
    slot_index = COALESCE(slot_index, 0)
WHERE slide_index IS NULL OR slot_index IS NULL;

-- Create indexes (will skip if they already exist)
CREATE INDEX IF NOT EXISTS idx_hero_products_active ON public.hero_products (is_active, slide_index, slot_index);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hero_products_slot ON public.hero_products (slide_index, slot_index);

-- Enable RLS
ALTER TABLE public.hero_products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view active hero products" ON public.hero_products;
DROP POLICY IF EXISTS "Admins can manage hero products" ON public.hero_products;

-- Create policies
CREATE POLICY "Public can view active hero products"
  ON public.hero_products
  FOR SELECT
  USING (is_active = true);

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

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'hero_products'
ORDER BY ordinal_position;

