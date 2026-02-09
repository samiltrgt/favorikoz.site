# NES e-Arşiv Fatura – Test Adımları

## 1. Ortam değişkenleri (.env.local)

Aşağıdaki üçü **dolu** olmalı; biri eksikse fatura kesilmez.

| Değişken | Test değeri | Açıklama |
|----------|-------------|----------|
| `NES_API_BASE_URL` | `https://apitest.nes.com.tr` | Sonunda `/` olmasın. |
| `NES_API_KEY` | (NES’in verdiği key) | Bearer token. |
| `NES_MARKETPLACE_ID` | Swagger örnek veya NES’ten UUID | Pazaryeri entegrasyon ID’si. |

**Test için:** Projede test amaçlı bir örnek UUID tanımlı (`d3557de7-07ca-43ee-bde7-ae4f45a658f8`). NES “pazaryeri bulunamadı” / 404 dönerse NES portalden **kendi pazaryeri UUID’nizi** alıp `NES_MARKETPLACE_ID` yapın.

---

## 2. Yapılandırma kontrolü

Projeyi çalıştırıp:

```http
GET https://www.favorikozmetik.com/api/nes/status
```

veya local: `http://localhost:3000/api/nes/status`

**Beklenen (yapılandırma tamamsa):**

```json
{
  "success": true,
  "nesConfigured": true,
  "message": "NES e-arşiv yapılandırıldı; ödeme başarılı olunca fatura kesilecek."
}
```

`nesConfigured: false` ise `.env.local`’da bu üç değişkeni kontrol edin.

---

## 3. Swagger ile manuel test (isteğe bağlı)

- **E-Fatura (fatura oluşturma):** https://apitest.nes.com.tr/einvoice/index.html  
- **E-Arşiv (PDF vb.):** https://apitest.nes.com.tr/earchive/index.html  

Bearer token: `.env.local`’daki `NES_API_KEY`.

---

## 4. Gerçek ödeme ile test (Iyzico sandbox)

1. Sitede sepete ürün ekle, ödeme ekranına git.
2. Iyzico sandbox kartı ile ödemeyi tamamla.
3. Callback’te sipariş `paid` olur ve NES’e fatura isteği gider.
4. **Kontrol:** Giriş yapıp **Siparişlerim** → ilgili siparişte **“Fatura İndir”** çıkmalı. Tıklayınca PDF açılmalı.

---

## 5. Ödeme olmadan hızlı test (test token)

1. Sipariş oluştur; sipariş numarasını not al (örn. `ORD-...`).
2. Supabase **orders** tablosunda bu siparişi `status = 'paid'`, `payment_status = 'completed'` yap.
3. Tarayıcıda veya curl ile:

   ```http
   GET https://www.favorikozmetik.com/api/payment/status?token=test-token-123&orderNumber=ORD-XXXXX
   ```

   (ORD-XXXXX yerine kendi sipariş numaranız.)

4. **Siparişlerim** veya **orders** tablosunda `invoice_uuid` / `invoice_pdf_url` dolu mu kontrol et; **Fatura İndir** ile PDF’i aç.

---

## 6. Fatura yeniden deneme

Ödeme tamamlandı ama fatura kesilmediyse:

```http
POST https://www.favorikozmetik.com/api/nes/invoice-retry
Content-Type: application/json

{ "orderNumber": "ORD-XXXXX" }
```

`NES_INVOICE_RETRY_SECRET` tanımlıysa istekte `Authorization: Bearer <secret>` veya `?secret=<secret>` gerekir.

---

## Test checklist

- [ ] `.env.local`: `NES_API_BASE_URL`, `NES_API_KEY`, `NES_MARKETPLACE_ID` dolu
- [ ] `GET /api/nes/status` → `nesConfigured: true`
- [ ] Bir siparişi öde (veya test token ile payment/status çağır)
- [ ] Siparişlerim’de “Fatura İndir” görünüyor
- [ ] Fatura PDF’i açılıyor

Hata alırsanız sunucu loglarında “NES e-arşiv fatura hatası” / “NES fatura uyarısı” mesajlarına bakın; NES’ten dönen detay orada olur.
