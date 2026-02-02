-- Kargo takip numarası (manuel admin girişi) – Sürat Kargo
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS carrier text DEFAULT 'surat';

COMMENT ON COLUMN public.orders.tracking_number IS 'Kargo takip / barkod numarası (admin manuel girer)';
COMMENT ON COLUMN public.orders.carrier IS 'Kargo firması kodu (surat, aras, vb.) – takip linki için';
