-- Iyzico 3DS v2 tamamlama için init sırasındaki basketId saklanır (payment/v2/3dsecure/auth).
-- Supabase SQL Editor'da bir kez çalıştırın.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS iyzico_basket_id TEXT;

COMMENT ON COLUMN orders.iyzico_basket_id IS 'Iyzico threedsInitialize basketId; 3DS callback conversationData boşsa v2 auth ile tamamlama için gerekli';
