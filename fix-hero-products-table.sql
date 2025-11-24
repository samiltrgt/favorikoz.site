-- Fix hero_products table - Add missing columns if they don't exist
-- Run this in Supabase SQL Editor

-- Add slide_index column if it doesn't exist
ALTER TABLE public.hero_products
  ADD COLUMN IF NOT EXISTS slide_index INT NOT NULL DEFAULT 0;

-- Add slot_index column if it doesn't exist
ALTER TABLE public.hero_products
  ADD COLUMN IF NOT EXISTS slot_index INT NOT NULL DEFAULT 0;

-- Update existing records to have default values (if any)
UPDATE public.hero_products
SET slide_index = 0, slot_index = 0
WHERE slide_index IS NULL OR slot_index IS NULL;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_hero_products_active ON public.hero_products (is_active, slide_index, slot_index);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hero_products_slot ON public.hero_products (slide_index, slot_index);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'hero_products'
ORDER BY ordinal_position;

