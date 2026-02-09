# Ödeme callback kontrolü

Sipariş "beklemede" kalıyorsa callback'e istek gelip gelmediğini şöyle kontrol edebilirsin.

---

## 1. Tarayıcı (callback sayfası)

Ödeme tamamladıktan sonra **callback sayfasına** (ödeme başarılı/başarısız ekranı) geldiğinde:

1. **F12** → **Console** sekmesini aç.
2. Şunları göreceksin:
   - **`[Ödeme callback] Sayfa açıldı, URL parametreleri:`**  
     - `token: "abc123..."` veya `token: null`  
     - `orderNumber: "ORD-..."` veya `null`
   - **Token yoksa:**  
     **`[Ödeme callback] Token yok – Iyzico bu sayfaya token/conversationId eklemeden yönlendirmiş olabilir. Mevcut URL:`**  
     Hemen altında **tam URL** yazacak; bunu kopyala (Iyzico’nun seni hangi adrese getirdiğini görmek için).
   - **Token varsa:**  
     **`[Ödeme callback] API yanıtı:`**  
     - `status: "success"` → API siparişi güncelledi.  
     - `status: "failed"` veya `error: "..."` → API’den dönen hata mesajına bak.

**Network sekmesi:**  
- **F12 → Network** → sayfayı yenile veya ödemeyi tekrarla.  
- **`payment/status`** veya **`status?token=...`** isteğini bul.  
- Yoksa callback sayfası **API’yi hiç çağırmıyor** (genelde **token yok** demektir).  
- Varsa tıkla → **Response** kısmında dönen `success` / `error` mesajına bak.

---

## 2. Sunucu logları

**`/api/payment/status`** çağrıldığında sunucu tarafında şu loglar basılır:

- **`[payment/status] İstek alındı`**  
  - `hasToken`, `tokenPrefix`, `orderNumber`  
  → İstek gelmiş mi, token/orderNumber var mı?
- **`[payment/status] Iyzico sonucu`**  
  → Iyzico’dan dönen `status` ve varsa `errorMessage`.
- **`[payment/status] Sipariş güncellendi (ödendi)`** veya **`Order update error`**  
  → Sipariş gerçekten güncellenmiş mi?

**Nerede görürsün?**

- **Lokal:** `npm run dev` çalıştırdığın terminalde.
- **Vercel:** Vercel Dashboard → Proje → **Logs** (veya **Functions** → ilgili fonksiyon logları).

Ödeme denemesinden sonra bu loglardan **hiçbiri** yoksa **callback’e istek gelmiyor** demektir (sayfa API’yi çağırmıyor veya farklı bir domain’e gidiyor).

---

## 3. Ödeme başlarken (callback URL)

Sipariş verip **ödeme adımına** geçtiğinde sunucu logunda:

- **`[payment] Iyzico callback URL (ödeme sonrası kullanıcı buraya yönlendirilir):`**  
  Hemen yanında yazan URL, Iyzico’ya verdiğimiz callback adresi.

Bu adres **site adresinle** uyumlu olmalı (örn. `https://www.favorikozmetik.com/payment/callback`).  
Yanlış veya farklı bir domain görürsen (localhost, başka domain) sorun büyük ihtimalle orada.

---

## 4. Özet tablo

| Gördüğün | Anlamı |
|----------|--------|
| Console’da **token: null** | Iyzico callback sayfasına **token/conversationId eklemeden** yönlendiriyor. URL’yi ve Iyzico ayarlarını kontrol et. |
| Console’da **token var**, API **success** | Callback ve API çalışıyor; sipariş güncellenmiş olmalı. Siparişlerim’i yenile. |
| Console’da **token var**, API **failed** + error mesajı | Iyzico’dan dönen hata veya sipariş güncelleme hatası. Mesajı ve sunucu logunu incele. |
| Sunucu logunda **`[payment/status] İstek alındı` yok** | **/api/payment/status** hiç çağrılmıyor. Callback sayfasına token gelmiyor veya sayfa açılmıyor. |
| Sunucu logunda **Iyzico sonucu: failure** | Iyzico ödemeyi başarılı saymıyor veya `conversationId` ile sorgu başarısız. |

Bu adımlarla callback’e gerçekten istek gelip gelmediğini ve nerede takıldığını net görebilirsin.

---

## 5. Fatura oluştu mu? (NES e-arşiv)

Ödeme alındı ama **faturanın kesilip kesilmediğini** şöyle kontrol edebilirsin.

### A) Sitede

- **Siparişlerim** sayfasına gir.
- İlgili siparişte **"Fatura İndir"** linki görünüyorsa fatura oluşturulmuş demektir.

### B) Veritabanında (Supabase)

- **Table Editor** → **orders** tablosu.
- Ödenen siparişin satırında:
  - **invoice_uuid** dolu mu?
  - **invoice_pdf_url** dolu mu?
- İkisi de doluysa fatura NES’te oluşturulmuş ve kayda yazılmış.

### C) Sunucu logları (Vercel / lokal)

Ödeme callback’ten sonra `/api/payment/status` çalışır; ardından NES fatura denenir. Loglarda şunlara bak:

| Log mesajı | Anlamı |
|------------|--------|
| **`[payment/status] NES fatura atlandı: NES yapılandırılmamış`** | NES env eksik: `NES_API_BASE_URL`, `NES_API_KEY`, `NES_MARKETPLACE_ID` kontrol et. |
| **`[payment/status] NES fatura oluşturuluyor: ORD-...`** | Fatura isteği NES’e gönderildi. |
| **`✅ NES e-arşiv fatura oluşturuldu: ORD-...`** | Fatura başarıyla oluşturuldu; siparişe `invoice_uuid` ve `invoice_pdf_url` yazıldı. |
| **`NES fatura uyarısı: ORD-...`** + hata metni | NES hata döndü (ör. marketplace bulunamadı, yetki, format). Hata metnini incele. |
| **`NES e-arşiv fatura hatası:`** veya **`NES createEArchiveInvoice error:`** | NES API isteği 4xx/5xx veya network hatası. |

### D) Fatura oluşmadıysa – manuel yeniden deneme

Sipariş **ödendi** ama `invoice_uuid` boşsa:

1. **API ile yeniden dene:**  
   `POST /api/nes/invoice-retry`  
   Body: `{ "orderNumber": "ORD-XXXXX" }`  
   (Sipariş numarasını `orders.order_number` ile değiştir.)

2. NES’in test ortamı ve **marketplace** ayarlarını kontrol et:  
   `NES_EARSIV.md` ve `NES_TEST_ADIMLARI.md` içindeki adımlar ve Swagger/Postman linkleri.
