# Fatura Kontrol Listesi

Ödeme alındı ama fatura gözükmüyorsa şu adımları sırayla kontrol et:

---

## ✅ 1. Supabase'de Kontrol Et

**Supabase Dashboard** → **Table Editor** → **orders** tablosu

1. Yeni siparişi bul (sipariş numarası veya müşteri email ile ara).
2. Şu alanlara bak:
   - **`invoice_uuid`** → Dolu mu? (UUID formatında bir değer olmalı)
   - **`invoice_pdf_url`** → Dolu mu? (URL formatında bir değer olmalı)
   - **`invoiced_at`** → Dolu mu? (Tarih/saat)

**Sonuç:**
- ✅ **Üçü de doluysa** → Fatura oluşturulmuş. "Siparişlerim" sayfasında "Fatura İndir" görünmeli.
- ❌ **Boşsa** → Fatura oluşturulmamış. Aşağıdaki adımlara devam et.

---

## ✅ 2. NES Yapılandırması Kontrol Et

**Tarayıcıda:** `https://www.favorikozmetik.com/api/nes/status` (veya localhost:3000/api/nes/status)

**Beklenen yanıt:**
```json
{
  "success": true,
  "nesConfigured": true,
  "message": "NES e-arşiv yapılandırıldı; ödeme başarılı olunca fatura kesilecek."
}
```

**Eğer `nesConfigured: false` ise:**
- `.env.local` dosyasında şu değişkenlerin dolu olduğundan emin ol:
  - `NES_API_BASE_URL=https://apitest.nes.com.tr`
  - `NES_API_KEY=...` (API key'iniz)
  - `NES_MARKETPLACE_ID=...` (NES Portal'dan aldığınız marketplace UUID)
- **Vercel'de** de aynı env'leri eklemiş olmalısın (Settings → Environment Variables).

---

## ✅ 3. Sunucu Loglarını Kontrol Et

**Vercel:** Dashboard → Proje → **Logs** sekmesi  
**Lokal:** `npm run dev` çalıştırdığın terminal

Ödeme tamamlandıktan sonra şu log mesajlarından birini görmeli:

### ✅ İyi Senaryo:
```
[payment/status] İstek alındı { hasToken: true, ... }
[payment/status] Iyzico sonucu { status: 'success', ... }
[payment/status] Sipariş güncellendi (ödendi) ORD-XXXXX
[payment/status] NES fatura oluşturuluyor: ORD-XXXXX
✅ NES e-arşiv fatura oluşturuldu: ORD-XXXXX <uuid>
```

### ❌ Sorun Senaryoları:

**A) NES yapılandırılmamış:**
```
[payment/status] NES fatura atlandı: NES yapılandırılmamış (NES_API_BASE_URL, NES_API_KEY, NES_MARKETPLACE_ID)
```
→ `.env.local` ve Vercel env'lerini kontrol et.

**B) NES hata döndü:**
```
NES fatura uyarısı: ORD-XXXXX <hata mesajı>
```
veya
```
NES e-arşiv fatura hatası: 404 <hata detayı>
```
→ Hata mesajını oku. Genelde:
- **404** → Marketplace ID yanlış veya NES'te tanımlı değil
- **401** → API key yanlış veya süresi dolmuş
- **400** → İstek formatı hatalı (orderId, orderNumber eksik/yanlış)

**C) Hiç log yok:**
→ `/api/payment/status` hiç çağrılmamış. Callback sayfasına token gelmemiş olabilir.

---

## ✅ 4. Manuel Fatura Oluşturma (Retry)

Fatura oluşmadıysa ve loglarda hata görüyorsan, manuel olarak tekrar dene:

**Postman / curl / API aracı ile:**

```
POST https://www.favorikozmetik.com/api/nes/invoice-retry
Content-Type: application/json

{
  "orderNumber": "ORD-XXXXX"
}
```

**ORD-XXXXX** yerine gerçek sipariş numarasını yaz.

**Beklenen yanıt:**
```json
{
  "success": true,
  "message": "Fatura oluşturuldu",
  "invoice": {
    "uuid": "...",
    "pdfUrl": "..."
  }
}
```

**Hata yanıtı:**
```json
{
  "success": false,
  "error": "<NES'ten dönen hata mesajı>"
}
```

---

## ✅ 5. Siparişlerim Sayfasında Kontrol

**Site:** `/siparislerim` sayfasına git.

- Ödenen siparişte **"Fatura İndir"** linki görünüyor mu?
- Görünüyorsa → Fatura oluşturulmuş, PDF indirme çalışıyor.
- Görünmüyorsa → Supabase'de `invoice_pdf_url` boş demektir.

---

## 🔍 Hızlı Debug Checklist

- [ ] Supabase'de `invoice_uuid` dolu mu?
- [ ] `/api/nes/status` → `nesConfigured: true` mu?
- [ ] Vercel/Lokal loglarda "NES fatura oluşturuluyor" mesajı var mı?
- [ ] Loglarda hata mesajı var mı? (varsa ne diyor?)
- [ ] `NES_MARKETPLACE_ID` doğru mu? (NES Portal'dan aldığın UUID ile eşleşiyor mu?)
- [ ] Manuel retry (`/api/nes/invoice-retry`) çalışıyor mu?

---

## 📝 Notlar

- **Test ortamı:** `NES_API_BASE_URL=https://apitest.nes.com.tr` (test için)
- **Canlı ortam:** `NES_API_BASE_URL=https://api.nes.com.tr` (canlı için)
- **Marketplace ID:** NES Portal'da oluşturduğun marketplace'in UUID'si. Test için Swagger örneği kullanıyorsan (`d3557de7-07ca-43ee-bde7-ae4f45a658f8`) 404 alabilirsin; kendi UUID'ni kullanmalısın.

---

## 🆘 Hala Çalışmıyorsa

1. **NES Portal'ı kontrol et:** https://developertest.nes.com.tr/docs/
   - Swagger'da manuel test yap (POST `/einvoice/v1/uploads/marketplaces/{id}/orders/createinvoice`)
   - Marketplace ID'nin doğru olduğundan emin ol

2. **NES desteğine başvur:** Portal üzerinden veya email ile.

3. **Logları paylaş:** Vercel loglarında gördüğün tam hata mesajını not al.
