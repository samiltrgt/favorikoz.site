# NES e-Arşiv Fatura Entegrasyonu (v1 Swagger)

Ödeme başarılı olduktan sonra NES E-Invoice API (v1 Swagger) üzerinden e-arşiv fatura kesilir. **Pazaryeri (marketplace)** akışı kullanılır: `POST /v1/uploads/marketplaces/{id}/orders/createinvoice`.

## Gerekli Ortam Değişkenleri

| Değişken | Gerekli | Açıklama |
|----------|--------|----------|
| `NES_API_BASE_URL` | **Evet** | NES API ana adresi (sonunda `/` olmadan). Test: `https://developertest.nes.com.tr`. |
| `NES_API_KEY` | **Evet** | NES’in verdiği tek API anahtarı (Bearer token). |
| `NES_MARKETPLACE_ID` | **Evet** | Pazaryeri entegrasyon UUID’si (NES portalda ilgili pazaryeri kaydının id’si). |

Bu üçü dolu ve `NES_INVOICE_ENABLED` `false` değilse fatura entegrasyonu açık sayılır.

## Swagger Özeti (v1)

- **Sunucu base path:** `/einvoice` (örn. `NES_API_BASE_URL` + `/einvoice`)
- **Fatura oluşturma:** `POST /v1/uploads/marketplaces/{id}/orders/createinvoice`  
  `{id}` = `NES_MARKETPLACE_ID`
- **İstek gövdesi:** `CreateInvoicesFromMarketPlaceOrdersDto`  
  `beginDate`, `endDate`, `page`, `pageSize`, `orders[]` (her biri: `orderId`, `orderNumber`, `isEArchive: true`)
- **Yanıt:** Fatura kayıtları dizisi; her öğede `uuid`, `isSucceded`, `errorMessage`
- **PDF:** `GET /v1/outgoing/invoices/{uuid}/pdf` (Bearer). Projede PDF, `/api/nes/invoice-pdf?uuid=...` üzerinden proxy edilir; `invoice_pdf_url` bu adrese set edilir.

## NES_MARKETPLACE_ID nereden bulunur?

NES portalda “pazaryeri” / “marketplace” entegrasyonu tanımlanır; bu kaydın **UUID**’si `NES_MARKETPLACE_ID` olarak kullanılır. NES ile konuşurken “e-arşiv fatura için kullanacağım pazaryeri entegrasyon id’si” diye isteyebilirsiniz. Swagger’daki örnek: `ee450343-3a17-4e53-a926-95c90055ec22`.

## İsteğe Bağlı

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `NES_EINVOICE_PATH` | `/einvoice` | API base path (Swagger’da `/einvoice`). |
| `NES_INVOICE_ENABLED` | `true` | Fatura kesimini kapatmak için `false` yapın. |

## Örnek .env.local

```env
NES_API_BASE_URL=https://developertest.nes.com.tr
NES_API_KEY=your_api_key_from_nes
NES_MARKETPLACE_ID=ee450343-3a17-4e53-a926-95c90055ec22
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Akış

1. Ödeme Iyzico’da başarılı olunca `/api/payment/status` tetiklenir.
2. Sipariş `paid` yapılır.
3. NES yapılandırılmışsa `createEArchiveInvoice` çağrılır: NES’e `POST .../marketplaces/{id}/orders/createinvoice` ile sipariş gönderilir (`isEArchive: true`).
4. Başarılı yanıtta `uuid` alınır; `invoice_pdf_url` = `NEXT_PUBLIC_BASE_URL` + `/api/nes/invoice-pdf?uuid=...` olarak kaydedilir.
5. Müşteri “Siparişlerim”de “Fatura İndir” ile bu URL’e gider; sayfa NES’ten PDF’i alıp gösterir.

## Fatura yeniden deneme

Ödeme tamamlanmış ama faturası kesilmemiş sipariş için:

```bash
POST /api/nes/invoice-retry
Body: { "orderNumber": "ORD-..." }
```

Detay: NES’in verdiği **v1 Swagger** (E-Invoice API) dokümanına göre uyarlandı.
