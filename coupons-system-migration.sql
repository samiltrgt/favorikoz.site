-- ============================================
-- FAVORIKOZ COUPONS SYSTEM MIGRATION
-- ============================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_total_uses INT,
  max_uses_per_customer INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coupons_valid_range_chk CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons (is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_until ON public.coupons (valid_until);

CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_identity_key TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coupon_usage_per_order_uniq UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON public.coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_customer_key ON public.coupon_usages (customer_identity_key);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_customer ON public.coupon_usages (coupon_id, customer_identity_key);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_type TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_value NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS discount_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_before_coupon BIGINT,
  ADD COLUMN IF NOT EXISTS subtotal_after_coupon BIGINT;

-- Backfill subtotal values for existing orders
UPDATE public.orders
SET
  subtotal_before_coupon = COALESCE(subtotal_before_coupon, subtotal),
  subtotal_after_coupon = COALESCE(subtotal_after_coupon, subtotal)
WHERE subtotal_before_coupon IS NULL
   OR subtotal_after_coupon IS NULL;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all" ON public.coupons
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "coupon_usages_admin_all" ON public.coupon_usages;
CREATE POLICY "coupon_usages_admin_all" ON public.coupon_usages
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS set_updated_at_coupons ON public.coupons;
CREATE TRIGGER set_updated_at_coupons
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
