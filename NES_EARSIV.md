# NES e-Arşiv Fatura Entegrasyonu

Bu proje, **NES Developer Portal** dokümantasyonuna göre e-arşiv fatura entegrasyonu yapar.

- **Resmi dokümantasyon:** [https://developertest.nes.com.tr/docs/](https://developertest.nes.com.tr/docs/)
- **E-Fatura API / E-Arşiv API** bölümlerinde tanımlı endpoint’ler ve DTO’lar kullanılır.
- Görüş ve öneri: [entegrasyon@nesbilgi.com.tr](mailto:entegrasyon@nesbilgi.com.tr)

---

## 1. Portal ve API Özeti

| Bilgi | Değer |
|-------|--------|
| **Dokümantasyon (portal)** | `https://developertest.nes.com.tr` – sadece döküman, API çağrısı değil |
| **API base URL (test)** | NES’in verdiği adres. Örn: `https://apitest.nes.com.tr` veya `https://developertest.nes.com.tr` – **NES’ten hangisi söylendiyse onu kullan** |
| E-Invoice base path | `/einvoice` (kod bunu base URL’e ekler) |
| Yetkilendirme | `Authorization: Bearer {NES_API_KEY}` |

Kullanılan endpoint’ler:

| İşlem | Method | Endpoint (path) |
|--------|--------|------------------|
| E-arşiv fatura oluşturma | POST | `/einvoice/v1/uploads/marketplaces/{marketplaceId}/orders/createinvoice` |
| E-arşiv fatura PDF indirme | GET | `/earchive/v1/invoices/{uuid}/pdf` |

İstek gövdesi (fatura oluşturma), Portal’daki **CreateInvoicesFromMarketPlaceOrdersDto** ile uyumludur: `beginDate`, `endDate`, `page`, `pageSize`, `orders[]` (içinde `orderId`, `orderNumber`, `isEArchive: true` vb.).

### NES e-Dönüşüm API – Swagger ve Postman adresleri

| API | Swagger URL | Postman Collection |
|-----|-------------|-------------------|
| E-Fatura | https://apitest.nes.com.tr/einvoice/index.html | https://apitest.nes.com.tr/einvoice/v1.swagger.taged.json |
| E-Arşiv | https://apitest.nes.com.tr/earchive/index.html | https://apitest.nes.com.tr/earchive/v1.swagger.taged.json |
| E-SMM | https://apitest.nes.com.tr/esmm/index.html | https://apitest.nes.com.tr/esmm/v1.swagger.taged.json |
| E-MM | https://apitest.nes.com.tr/emm/index.html | https://apitest.nes.com.tr/emm/v1.swagger.taged.json |
| E-İrsaliye | https://apitest.nes.com.tr/edespatch/index.html | https://apitest.nes.com.tr/edespatch/v1.swagger.taged.json |

Bu projede sadece **E-Fatura** (fatura oluşturma) ve **E-Arşiv** (PDF indirme) kullanılıyor.

### Kod / env ile NES adresleri uyumu

| Ne | Değer | NES’teki karşılığı |
|----|--------|---------------------|
| Base URL | `NES_API_BASE_URL` = `https://apitest.nes.com.tr` | Swagger’ların base’i |
| Fatura oluşturma | `{BASE}/einvoice/v1/uploads/marketplaces/{id}/orders/createinvoice` | E-Fatura Swagger |
| PDF indirme | `{BASE}/earchive/v1/invoices/{uuid}/pdf` | E-Arşiv Swagger |
| Path override | `NES_EINVOICE_PATH` / `NES_EARCHIVE_PATH` (isteğe bağlı) | Varsayılan: `einvoice`, `earchive` |

---

## 2. Ortam Değişkenleri

### Zorunlu

| Değişken | Açıklama |
|----------|----------|
| `NES_API_BASE_URL` | NES’in verdiği API ana adresi (sonunda `/` olmadan). Test örn: `https://apitest.nes.com.tr` veya `https://developertest.nes.com.tr` |
| `NES_API_KEY` | NES’in verdiği API anahtarı (Bearer token) |
| `NES_MARKETPLACE_ID` | Portal’da tanımlı pazaryeri (marketplace) entegrasyonunun UUID’si |

### İsteğe bağlı

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `NES_EINVOICE_PATH` | `einvoice` | E-Invoice base path (Portal’da `/einvoice`) |
| `NES_INVOICE_ENABLED` | `true` | Fatura kesimini kapatmak için `false` |
| `NEXT_PUBLIC_BASE_URL` | - | Sitenin base URL’i; fatura PDF linki buraya göre üretilir |
| `NES_INVOICE_RETRY_SECRET` | - | Fatura yeniden deneme API’si için isteğe bağlı Bearer/secret |

`NES_API_BASE_URL`, `NES_API_KEY` ve `NES_MARKETPLACE_ID` dolu ve `NES_INVOICE_ENABLED` `false` değilse entegrasyon “yapılandırılmış” kabul edilir.

---

## 3. NES_MARKETPLACE_ID

Portal’da “pazaryeri” / “marketplace” entegrasyonu oluşturulur; bu kaydın **UUID**’si `NES_MARKETPLACE_ID` olarak kullanılır. NES ile iletişimde “e-arşiv fatura için kullanacağım pazaryeri entegrasyon id’si” şeklinde talep edilebilir.

---

## 4. Proje İçi Akış

1. Ödeme (Iyzico) başarılı olunca `GET /api/payment/status` tetiklenir.
2. Sipariş `paid` / `completed` yapılır.
3. NES yapılandırılmışsa `createEArchiveInvoice` çağrılır:  
   `POST .../marketplaces/{id}/orders/createinvoice` ile sipariş gönderilir (`isEArchive: true`).
4. Yanıtta `uuid` alınır; `invoice_pdf_url` = `NEXT_PUBLIC_BASE_URL` + `/api/nes/invoice-pdf?uuid=...` olarak siparişe yazılır.
5. Müşteri “Fatura İndir” ile bu URL’e gider; sayfa NES’ten PDF’i alıp gösterir (proxy).

### Fatura yeniden deneme

Ödeme tamamlanmış ancak fatura kesilmemiş sipariş için:

```http
POST /api/nes/invoice-retry
Content-Type: application/json

{ "orderNumber": "ORD-..." }
```

Veya query: `?orderNumber=ORD-...`  
İsteğe bağlı: `NES_INVOICE_RETRY_SECRET` tanımlıysa istekte `Authorization: Bearer {secret}` veya `?secret=...` gerekir.

### Yapılandırma kontrolü

```http
GET /api/nes/status
```

NES’in yapılandırılıp yapılandırılmadığını döner.

---

## 5. Örnek .env.local

```env
# NES'ten aldığın API base URL (test için genelde apitest veya developertest)
NES_API_BASE_URL=https://apitest.nes.com.tr
NES_API_KEY=your_api_key_from_nes_portal
NES_MARKETPLACE_ID=ee450343-3a17-4e53-a926-95c90055ec22
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Tüm detaylar ve güncel endpoint tanımları için **[NES Developer Portal](https://developertest.nes.com.tr/docs/)** dokümantasyonuna bakın.
