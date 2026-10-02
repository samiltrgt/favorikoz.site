-- FAZ 1.2: Reklam kimlikleri + CAPI kilit kolonları (orders)
-- RLS mevcut orders politikalarıyla korunur; müşteri API yanıtlarına eklenmez.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fbp text,
  ADD COLUMN IF NOT EXISTS fbc text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS gbraid text,
  ADD COLUMN IF NOT EXISTS wbraid text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS client_ip text,
  ADD COLUMN IF NOT EXISTS client_user_agent text,
  ADD COLUMN IF NOT EXISTS meta_purchase_sent_at timestamptz;

COMMENT ON COLUMN public.orders.meta_purchase_sent_at IS 'Meta CAPI Purchase gönderildiğinde set edilir; çift gönderimi engeller';
