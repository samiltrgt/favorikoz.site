# 💰 FİYAT FORMAT DOKÜMANTASYONU

## 📊 GENEL BAKIŞ

Sitede **3 farklı fiyat formatı** kullanılıyor ve bu karışıklığa neden oluyor:

1. **KURUŞ** (Database formatı) - 100 TL = 10000 kuruş
2. **TL** (API response formatı) - 100 TL = 100
3. **10X** (Sepet formatı) - 100 TL = 1000

---

## 🗄️ 1. DATABASE (Supabase) - KURUŞ CİNSİNDEN

**Format:** Kuruş (1 TL = 100 kuruş)

**Örnek:**
- 100 TL → Database'de: `10000`
- 1499 TL → Database'de: `149900`
- 50.50 TL → Database'de: `5050`

**Kullanıldığı Yerler:**
- `products.price` (BIGINT)
- `products.original_price` (BIGINT)
- `orders.subtotal` (BIGINT)
- `orders.shipping_cost` (BIGINT)
- `orders.total` (BIGINT)
- `orders.items[].price` (JSONB içinde)

**Kod Örnekleri:**
```typescript
// Database'e kaydetme (TL → Kuruş)
price: Math.round(body.price * 100)  // 100 TL → 10000

// Database'den okuma (Kuruş → TL)
price: p.price / 100  // 10000 → 100 TL
```

**Dosyalar:**
- `src/app/api/products/route.ts` (line 64, 130, 151)
- `src/app/api/products/[id]/route.ts` (line 49, 108, 134)
- `src/app/api/payment/route.ts` (line 170-172)
- `src/app/page.tsx` (line 39)

---

## 🔄 2. API RESPONSE - TL CİNSİNDEN

**Format:** TL (1 TL = 1)

**Örnek:**
- Database'de: `10000` → API'de: `100`
- Database'de: `149900` → API'de: `1499`

**Dönüşüm:**
```typescript
// API GET response
price: p.price / 100  // Kuruş → TL
```

**Kullanıldığı Yerler:**
- `/api/products` GET response
- `/api/products/[id]` GET response
- `/api/featured-products` GET response
- `src/app/page.tsx` (server component)

**Dosyalar:**
- `src/app/api/products/route.ts` (line 64-65)
- `src/app/api/products/[id]/route.ts` (line 49-50)
- `src/app/api/featured-products/route.ts` (line 57-58)
- `src/app/page.tsx` (line 39-40)

---

## 🛒 3. SEPET (LocalStorage) - 10X FORMATI

**Format:** 10 ile çarpılmış (1 TL = 10 birim)

**Örnek:**
- 100 TL → Sepet'te: `1000`
- 1499 TL → Sepet'te: `14990`
- 50.50 TL → Sepet'te: `505`

**Neden 10X?**
- API'den gelen fiyat (TL formatında) direkt sepete kaydediliyor
- Ama display için `/10` yapılıyor (yanlış!)
- Bu yüzden aslında TL formatında tutulmalı ama `/10` yapıldığı için 10X gibi görünüyor

**Kullanıldığı Yerler:**
- `localStorage.cart` (CartItem.price)
- Sepet hesaplamaları
- Checkout sayfası

**Dosyalar:**
- `src/app/sepet/page.tsx` (line 48, 72, 245)
- `src/app/checkout/page.tsx` (line 75)
- `src/lib/cart.ts`

**Display:**
```typescript
// Sepet sayfasında gösterim
₺{(item.price / 10).toLocaleString(...)}  // 1000 → 100 TL
```

---

## 📋 4. SİPARİŞLER (Orders) - KURUŞ CİNSİNDEN

**Format:** Kuruş (Database ile aynı)

**Örnek:**
- 100 TL → Order'da: `10000`
- 1499 TL → Order'da: `149900`

**Display:**
```typescript
// Siparişlerim sayfasında
const formatPrice = (price: number) => {
  return (price / 100).toLocaleString(...)  // 10000 → 100 TL
}
```

**Dosyalar:**
- `src/app/(auth)/siparislerim/page.tsx` (line 128)
- `src/app/admin/orders/page.tsx` (line 125)

---

## 🔍 DETAYLI KULLANIM YERLERİ

### A. ÜRÜN LİSTELEME SAYFALARI

#### 1. Ana Sayfa (`/`)
- **Format:** TL (API'den `/100` yapılmış)
- **Display:** Direkt gösteriliyor
- **Kod:** `product.price.toLocaleString(...)`
- **Dosya:** `src/components/product-card.tsx` (line 153)

#### 2. Tüm Ürünler (`/tum-urunler`)
- **Format:** TL (API'den `/100` yapılmış)
- **Display:** `/10` yapılıyor ❌ **YANLIŞ!**
- **Kod:** `₺{(product.price / 10).toLocaleString(...)}`
- **Dosya:** `src/app/tum-urunler/page.tsx` (line 84, 176)

#### 3. Kategori Sayfası (`/kategori/[category]`)
- **Format:** TL (API'den `/100` yapılmış)
- **Display:** `/10` yapılıyor ❌ **YANLIŞ!**
- **Kod:** `₺{(product.price / 10).toLocaleString(...)}`
- **Dosya:** `src/app/kategori/[category]/page.tsx` (line 232, 236)

#### 4. Alt Kategori Sayfası (`/kategori/[category]/[subcategory]`)
- **Format:** TL (API'den `/100` yapılmış)
- **Display:** Direkt gösteriliyor ✅
- **Kod:** `₺{product.price.toLocaleString(...)}`
- **Dosya:** `src/app/kategori/[category]/[subcategory]/page.tsx` (line 281, 285)

#### 5. Ürün Detay (`/urun/[slug]`)
- **Format:** TL (API'den `/100` yapılmış)
- **Display:** `/10` yapılıyor ❌ **YANLIŞ!**
- **Kod:** `₺{(product.price / 10).toLocaleString(...)}`
- **Dosya:** `src/app/urun/[slug]/page.tsx` (line 189, 191)

### B. SEPET SAYFASI (`/sepet`)

**Format:** 10X (LocalStorage'dan)

**Hesaplamalar:**
```typescript
const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
// Örnek: 1000 * 2 = 2000 (200 TL)

const shipping = subtotal >= 14990 ? 0 : 1000
// 14990 = 1499 TL (10X formatında)
// 1000 = 100 TL (10X formatında)

const total = subtotal - discount + shipping
```

**Display:**
```typescript
₺{(subtotal / 10).toLocaleString(...)}  // 2000 → 200 TL
₺{(shipping / 10).toLocaleString(...)}  // 1000 → 100 TL
```

**Dosya:** `src/app/sepet/page.tsx`

### C. CHECKOUT SAYFASI (`/checkout`)

**Format:** 10X (Sepet'ten geliyor)

**Hesaplama:**
```typescript
const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
// 10X formatında
```

**Display:**
```typescript
₺{(item.price * item.quantity).toFixed(2)}  // ❌ YANLIŞ! /10 yapılmalı
```

**Dosya:** `src/app/checkout/page.tsx` (line 75, 163)

### D. PAYMENT API (`/api/payment`)

**Gelen Format:** 10X (Sepet'ten)

**İşlemler:**
```typescript
// Subtotal hesaplama (10X formatında)
const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0)

// Kargo hesaplama (10X formatında)
const shipping = subtotal >= 14990 ? 0 : 1000

// Total (10X formatında)
const totalPrice = subtotal + shipping

// Iyzico'ya gönderme (TL formatına çevir)
const priceStr = toPriceString(totalPrice / 10)  // 10X → TL

// Database'e kaydetme (Kuruş formatına çevir)
subtotal: Math.round(subtotal * 10)  // 10X → Kuruş (10X * 10 = Kuruş)
shipping_cost: Math.round(shipping * 10)
total: Math.round(totalPrice * 10)
```

**Dosya:** `src/app/api/payment/route.ts`

### E. ADMIN SAYFALARI

#### 1. Admin Ürünler (`/admin/products`)
- **Format:** TL (API'den `/100` yapılmış)
- **Display:** Direkt gösteriliyor ✅
- **Kod:** `₺{product.price.toLocaleString(...)}`
- **Dosya:** `src/app/admin/products/page.tsx` (line 225)

#### 2. Admin Siparişler (`/admin/orders`)
- **Format:** Kuruş (Database'den direkt)
- **Display:** `/100` yapılıyor ✅
- **Kod:** `formatPrice(price)` → `(price / 100).toLocaleString(...)`
- **Dosya:** `src/app/admin/orders/page.tsx` (line 125)

### F. MÜŞTERİ SAYFALARI

#### 1. Siparişlerim (`/siparislerim`)
- **Format:** Kuruş (Database'den direkt)
- **Display:** `/100` yapılıyor ✅
- **Kod:** `formatPrice(price)` → `(price / 100).toLocaleString(...)`
- **Dosya:** `src/app/(auth)/siparislerim/page.tsx` (line 128)

---

## ⚠️ SORUNLAR VE TUTARSIZLIKLAR

### 1. ❌ YANLIŞ: `/10` Yapılan Yerler

Bu sayfalarda API'den TL formatında gelen fiyat `/10` yapılıyor (yanlış!):

- `src/app/tum-urunler/page.tsx` (line 84, 176)
- `src/app/kategori/[category]/page.tsx` (line 232, 236)
- `src/app/urun/[slug]/page.tsx` (line 189, 191)

**Sorun:** API'den zaten TL formatında geliyor, `/10` yapılınca 10 kat küçük gösteriliyor!

**Çözüm:** `/10` kaldırılmalı, direkt gösterilmeli.

### 2. ❌ YANLIŞ: Checkout Sayfası

```typescript
// Yanlış:
₺{(item.price * item.quantity).toFixed(2)}

// Doğru olmalı:
₺{((item.price * item.quantity) / 10).toLocaleString('tr-TR', {...})}
```

### 3. ⚠️ KARMAŞIK: Sepet Formatı

Sepet'te fiyatlar 10X formatında tutuluyor ama bu tutarsız:
- API'den TL geliyor
- Sepet'e direkt kaydediliyor (TL olmalı)
- Ama display'de `/10` yapılıyor (10X gibi davranılıyor)

**Öneri:** Sepet formatını standartlaştırmak gerekiyor.

---

## ✅ ÖNERİLEN ÇÖZÜM

### Standart Format: TL (1 TL = 1)

1. **Database:** Kuruş (değişmez)
2. **API Response:** TL (`/100` yapılıyor) ✅
3. **Sepet:** TL (API'den direkt) ✅
4. **Display:** TL (direkt göster) ✅
5. **Orders:** Kuruş (Database ile aynı) ✅

### Düzeltilmesi Gerekenler:

1. ❌ `/10` yapılan tüm yerlerden kaldırılmalı
2. ❌ Checkout sayfası düzeltilmeli
3. ✅ Sepet hesaplamaları TL formatına göre güncellenmeli
4. ✅ Payment API'de dönüşümler düzeltilmeli

---

## 📝 ÖZET TABLO

| Yer | Format | Display | Durum |
|-----|--------|---------|-------|
| Database | Kuruş | - | ✅ |
| API Response | TL | - | ✅ |
| Ana Sayfa | TL | Direkt | ✅ |
| Tüm Ürünler | TL | `/10` ❌ | ❌ |
| Kategori | TL | `/10` ❌ | ❌ |
| Alt Kategori | TL | Direkt | ✅ |
| Ürün Detay | TL | `/10` ❌ | ❌ |
| Sepet | 10X | `/10` | ⚠️ |
| Checkout | 10X | Direkt ❌ | ❌ |
| Payment API | 10X→TL→Kuruş | - | ⚠️ |
| Admin Ürünler | TL | Direkt | ✅ |
| Admin Siparişler | Kuruş | `/100` | ✅ |
| Siparişlerim | Kuruş | `/100` | ✅ |

---

**Son Güncelleme:** 2025-01-21

