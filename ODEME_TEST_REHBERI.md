# Ödeme Durumu Test Rehberi

Ödeme tamamlandığında siparişin otomatik **Ödendi** olarak güncellenmesini test etmek için iki yöntem:

---

## 1. Mock ile test (Iyzico anahtarları olmadan)

Gerçek kart/ödeme olmadan, sadece akışı doğrulamak için.

### Adımlar

1. **Iyzico’yu kapatın (opsiyonel)**  
   `.env.local` içinde `IYZICO_API_KEY` ve `IYZICO_SECRET_KEY` yoksa veya boşsa API mock modda çalışır.

2. **Uygulamayı çalıştırın**
   ```bash
   npm run dev
   ```

3. **Sepete ürün ekleyin**  
   Anasayfa veya ürün sayfasından sepete 1–2 ürün ekleyin.

4. **Checkout’a gidin**  
   - Sepet → Ödemeye Geç  
   - Kişisel bilgiler: Ad, soyad, e‑posta, telefon, **TC Kimlik No (11 hane)**  
   - Teslimat adresi  
   - Ödeme bilgileri: Mock’ta kart gerçekten kullanılmaz, isterseniz sahte doldurun  
   - Sözleşmeleri kabul edin → **Ödemeyi Tamamla**

5. **Beklenen sonuç**
   - Tarayıcı `/payment/callback?token=test-token-...&orderNumber=ORD-...` adresine yönlenir.
   - Sayfa “Ödeme Başarılı!” mesajını gösterir.
   - Arka planda `/api/payment/status` çağrılır, sipariş **paid** / **completed** olarak güncellenir.

6. **Siparişin güncellendiğini kontrol edin**
   - **Admin:** Giriş yap → Siparişler → Son siparişte durum **Ödendi** / **Tamamlandı** olmalı.
   - **Supabase:** `orders` tablosunda ilgili satırda `status = 'paid'`, `payment_status = 'completed'` olmalı.

---

## 2. Iyzico Sandbox ile test (gerçek ödeme akışı)

Iyzico sandbox hesabı ve test kartı ile gerçek ödeme akışını denemek için.

### Ön koşul

- [Iyzico Sandbox](https://sandbox-merchant.iyzipay.com/) hesabı
- `.env.local` içinde:
  ```env
  IYZICO_API_KEY=sandbox-xxx
  IYZICO_SECRET_KEY=sandbox-xxx
  IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
  ```

### Test kartı (sandbox)

- **Kart no:** 5528790000000008  
- **Son kullanma:** 12/30  
- **CVC:** 123  

(İsim vb. alanları rastgele doldurabilirsiniz.)

### Adımlar

1. Sepete ürün ekleyin, checkout’u doldurup **Ödemeyi Tamamla**’ya tıklayın.
2. Iyzico sayfasında yukarıdaki test kartı bilgilerini girin (3DS açıksa sandbox’ta genelde otomatik onaylanır).
3. Ödeme sonrası `/payment/callback?token=...&orderNumber=...` adresine dönülür.
4. Sayfa “Ödeme Başarılı!” gösterir; `/api/payment/status` Iyzico’dan sonucu alıp siparişi **paid** / **completed** yapar.
5. Admin panelinde veya Supabase’de siparişin **Ödendi** olduğunu kontrol edin.

---

## 3. Sadece Status API’yi test etmek

Mevcut bir **pending** siparişi elle “ödendi” yapmak için (örneğin callback atlandıysa):

1. Supabase’de bir siparişin `order_number` ve `payment_token` (conversationId) değerlerini alın.
2. Tarayıcı veya curl ile:
   ```text
   GET /api/payment/status?token=BU_TOKEN_DEGERI&orderNumber=ORD-123456-ABC
   ```
   (Token yoksa sadece `orderNumber` ile güncelleme yapılmaz; token veya orderNumber gerekir.)

3. Yanıt `{ "success": true, "status": "success" }` ise sipariş güncellenmiş demektir.
4. **Not:** Gerçek Iyzico token’ı ile çağrı yapıyorsanız Iyzico’da bu ödemenin başarılı olması gerekir; mock token (`test-token-...`) ile çağrıda Iyzico’ya istek gitmez, sadece sipariş güncellenir.

---

## Hızlı kontrol listesi

| Adım                         | Mock | Sandbox |
|-----------------------------|------|--------|
| Sepete ürün ekle            | ✅   | ✅     |
| Checkout formu doldur (TC dahil) | ✅   | ✅     |
| Ödemeyi Tamamla             | ✅   | ✅     |
| Callback sayfasında “Ödeme Başarılı” | ✅   | ✅     |
| Admin’de sipariş “Ödendi”   | ✅   | ✅     |
| Supabase’de status=paid, payment_status=completed | ✅   | ✅     |

Sorun olursa tarayıcı **Network** sekmesinde `/api/payment` ve `/api/payment/status` isteklerinin yanıtlarına ve sunucu loglarına bakın.
