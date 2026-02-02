-- Siparişlere fatura alanları ve müşteri TC (e-arşiv için)
-- Supabase SQL Editor'da çalıştırın.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_tc TEXT,
  ADD COLUMN IF NOT EXISTS invoice_uuid TEXT,
  ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.customer_tc IS 'Müşteri TC Kimlik No (e-arşiv fatura için)';
COMMENT ON COLUMN public.orders.invoice_uuid IS 'NES/GIB e-arşiv fatura UUID';
COMMENT ON COLUMN public.orders.invoice_pdf_url IS 'Fatura PDF indirme linki';
COMMENT ON COLUMN public.orders.invoiced_at IS 'Fatura kesim tarihi';
