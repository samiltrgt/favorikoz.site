# 💳 Ödeme Altyapısı Kurulum Kılavuzu

## 📋 Genel Bakış

Bu proje **Iyzico** ödeme entegrasyonu ile çalışmaktadır.

### ✅ Tamamlanan Özellikler:
- ✅ Checkout sayfası (`/checkout`)
- ✅ Payment API (`/api/payment`)
- ✅ Payment callback sayfası (`/payment/callback`)
- ✅ Test mode desteği (Production olmadan test edebilirsiniz)
- ✅ Kart bilgileri formu
- ✅ Müşteri bilgileri formu

---

## 🚀 Hızlı Başlangıç

### 1️⃣ Test Mode (Önerilen)

Environment variable'lar olmadan test edebilirsiniz:

```bash
# .env.local dosyasına Iyzico key'lerini eklemeden çalıştır:
npm run dev
```

**Not:** Test mode'da ödeme simüle edilir, gerçek para transferi olmaz.

---

### 2️⃣ Production Mode

#### A. Iyzico Hesabı Oluşturma

1. [Iyzico Dashboard](https://merchant.iyzipay.com) → Hesap oluştur
2. **API Keys** bölümünden:
   - `API Key`
   - `Secret Key` al

#### B. Environment Variables Ekleme

`.env.local` dosyasına ekle:

```bash
# Iyzico Production
IYZICO_API_KEY=your_production_api_key
IYZICO_SECRET_KEY=your_production_secret_key
IYZICO_BASE_URL=https://api.iyzipay.com

# Application URL
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

#### C. Test İçin (Sandbox)

```bash
IYZICO_API_KEY=your_sandbox_api_key
IYZICO_SECRET_KEY=your_sandbox_secret_key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

NEXT_PUBLIC_BASE_URL=http://localhost:1700
```

---

## 📁 Dosya Yapısı

```
src/
├── app/
│   ├── checkout/
│   │   └── page.tsx              # Ödeme sayfası
│   ├── payment/
│   │   └── callback/
│   │       └── page.tsx           # Ödeme sonucu sayfası
│   └── api/
│       ├── payment/
│       │   ├── route.ts           # Ödeme başlatma API
│       │   └── status/
│       │       └── route.ts       # Ödeme durumu API
├── lib/
│   └── iyzico.ts                  # Iyzico SDK kurulumu
```

---

## 🔧 Kullanım

### Frontend'den Ödeme Başlatma

```typescript
const response = await fetch('/api/payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [
      { id: '1', name: 'Ürün 1', category: 'Kozmetik', price: 99.99, quantity: 1 }
    ],
    customerInfo: {
      name: 'Ahmet',
      surname: 'Yılmaz',
      email: 'ahmet@example.com',
      phone: '+905551234567',
      tc: '12345678901',
      address: 'İstanbul',
      city: 'İstanbul',
      zipCode: '34000',
      cardNumber: '5528 7900 0477 2834',
      expireMonth: '12',
      expireYear: '2025',
      cvc: '123'
    }
  })
})

const { paymentPageUrl, token } = await response.json()
window.location.href = paymentPageUrl
```

---

## 🧪 Test

### Test Kartları

Iyzico test kartları:

| Kart Numarası | Sonuç |
|---------------|-------|
| `5528 7900 0477 2834` | Başarılı |
| `5528 7900 0477 2802` | Red |
| `5528 7900 0477 2819` | 3DS Onayı |

---

## 📝 API Routes

### `POST /api/payment`

Ödeme başlatma.

**Request:**
```json
{
  "items": [
    {
      "id": "1",
      "name": "Ürün",
      "category": "Kategori",
      "price": 99.99,
      "quantity": 1
    }
  ],
  "customerInfo": {
    "name": "Ahmet",
    "surname": "Yılmaz",
    "email": "ahmet@example.com",
    "phone": "+905551234567",
    "tc": "12345678901",
    "address": "Adres",
    "city": "İstanbul",
    "zipCode": "34000",
    "cardNumber": "5528 7900 0477 2834",
    "expireMonth": "12",
    "expireYear": "2025",
    "cvc": "123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "token": "ORD-1234567-ABC123",
  "paymentPageUrl": "/payment/callback?token=...",
  "orderNumber": "ORD-1234567-ABC123"
}
```

### `GET /api/payment/status?token=...`

Ödeme durumu kontrolü.

**Response:**
```json
{
  "success": true,
  "status": "success"
}
```

---

## 🎯 Sonraki Adımlar

- ✅ Test mode çalışıyor
- ✅ Production mode için Iyzico keys ekle
- ✅ Sipariş oluşturma Supabase entegrasyonu
- ✅ Stock management
- ✅ Email bildirimleri
- ✅ Webhook handling

---

## ❓ Sorun Giderme

### "Ödeme başlatılamadı"

1. Environment variable'ları kontrol et
2. Iyzico API key'lerin doğru mu?
3. Network tab'da hata var mı?

### "Callback sayfası açılmıyor"

1. `NEXT_PUBLIC_BASE_URL` doğru mu?
2. Port uyumsuzluğu var mı? (localhost:1700 vs localhost:3000)

---

## 📞 Destek

- [Iyzico Dokümantasyon](https://dev.iyzipay.com)
- [Iyzico Dashboard](https://merchant.iyzipay.com)

