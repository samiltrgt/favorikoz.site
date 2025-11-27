-- Fix promo_banners position constraint to include 'footer'
-- Run this in Supabase SQL Editor if you get the constraint error

-- Drop the old constraint
ALTER TABLE public.promo_banners 
  DROP CONSTRAINT IF EXISTS promo_banners_position_check;

-- Add the new constraint with 'footer' included
ALTER TABLE public.promo_banners 
  ADD CONSTRAINT promo_banners_position_check 
  CHECK (position IN ('top', 'bottom', 'footer'));

-- Verify the constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.promo_banners'::regclass
  AND conname = 'promo_banners_position_check';

