# Cloudinary Entegrasyonu

Bu proje, ürün görsellerini yönetmek için **Cloudinary** kullanmaktadır. Cloudinary, bulut tabanlı bir görsel yönetim servisidir ve otomatik optimizasyon, CDN desteği ve kolay entegrasyon sağlar.

---

## 🚀 Kurulum

### 1. Cloudinary Hesabı Oluşturun

1. [Cloudinary](https://cloudinary.com/) sitesine gidin
2. Ücretsiz hesap oluşturun (25GB depolama + 25GB bant genişliği/ay)
3. Dashboard'dan aşağıdaki bilgileri alın:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 2. Environment Variables Ayarlayın

`.env.local` dosyanızı oluşturun veya düzenleyin:

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**⚠️ Önemli:** 
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` client-side'da kullanıldığı için `NEXT_PUBLIC_` prefix'i ile başlamalıdır
- Diğer değişkenler server-side'da kullanılır ve gizli kalmalıdır
- `.env.local` dosyasını **asla** git'e commit etmeyin

---

## 📦 Kullanılan Paketler

```json
{
  "cloudinary": "^1.41.0",
  "next-cloudinary": "^5.0.0"
}
```

---

## 📁 Dosya Yapısı

```
src/
├── lib/
│   └── cloudinary.ts          # Cloudinary helper fonksiyonları
├── components/
│   └── image-upload.tsx       # Drag & drop upload componenti
└── app/
    └── api/
        └── upload/
            └── route.ts       # Image upload API endpoint
```

---

## 🎯 Kullanım

### Admin Panelinde Ürün Ekleme

1. **Admin > Yeni Ürün Ekle** sayfasına gidin
2. **Ana Ürün Görseli** bölümünde:
   - Dosyayı tıklayarak seçin veya
   - Dosyayı sürükleyip bırakın
3. Görsel otomatik olarak Cloudinary'ye yüklenir
4. Yükleme tamamlandığında önizleme görünür
5. **Ek Görseller** için aynı işlemi tekrarlayın
6. Form'u kaydedin

### Desteklenen Formatlar

- **PNG**
- **JPG/JPEG**
- **WEBP**
- **GIF**

**Maksimum dosya boyutu:** 5MB

---

## ⚙️ Teknik Detaylar

### 1. Upload API (`/api/upload`)

```typescript
POST /api/upload
Content-Type: application/json

{
  "file": "data:image/jpeg;base64,...",  // Base64 encoded image
  "folder": "products"                   // Optional: Cloudinary folder
}

// Response:
{
  "success": true,
  "url": "https://res.cloudinary.com/.../image.jpg",
  "publicId": "favorikoz/products/xyz123"
}
```

### 2. Otomatik Optimizasyon

Cloudinary, yüklenen görselleri otomatik olarak optimize eder:

- **Boyut:** Maksimum 1000x1000px
- **Kalite:** Auto:good (optimal kalite/boyut dengesi)
- **Format:** Auto (en uygun format seçilir: WebP, AVIF, vs.)

### 3. Klasör Yapısı

Görseller Cloudinary'de şu şekilde organize edilir:

```
favorikoz/
└── products/           # Ürün görselleri
    ├── abc123.jpg
    ├── def456.png
    └── ...
```

---

## 🎨 ImageUpload Component

### Props

```typescript
interface ImageUploadProps {
  onUpload: (url: string) => void  // Upload tamamlandığında çağrılır
  currentImage?: string            // Mevcut görsel URL'i (opsiyonel)
  folder?: string                  // Cloudinary klasör adı (varsayılan: 'products')
}
```

### Örnek Kullanım

```tsx
import ImageUpload from '@/components/image-upload'

function MyForm() {
  const [imageUrl, setImageUrl] = useState('')

  return (
    <ImageUpload
      onUpload={setImageUrl}
      currentImage={imageUrl}
      folder="products"
    />
  )
}
```

---

## 🔒 Güvenlik

1. **API Keys:**
   - API Secret asla client-side'a expose edilmez
   - Tüm upload işlemleri server-side API route üzerinden yapılır

2. **Dosya Validasyonu:**
   - Dosya tipi kontrolü (sadece image/*)
   - Dosya boyutu limiti (5MB)
   - Base64 encoding ile güvenli transfer

3. **Rate Limiting:**
   - Cloudinary'nin ücretsiz planı:
     - 25GB depolama
     - 25GB bant genişliği/ay
     - 1000 transformasyon/ay

---

## 🐛 Sorun Giderme

### "Upload failed" hatası

**Çözüm 1:** Environment variables'ları kontrol edin
```bash
# .env.local dosyasında olmalı
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

**Çözüm 2:** Sunucuyu yeniden başlatın
```bash
npm run dev
```

### "File size too large" hatası

Dosya boyutu 5MB'dan küçük olmalıdır. Görseli sıkıştırın veya boyutunu küçültün.

### "Invalid file type" hatası

Sadece image formatları kabul edilir: PNG, JPG, WEBP, GIF

---

## 📊 Cloudinary Dashboard

Yüklenen görselleri yönetmek için:

1. [Cloudinary Dashboard](https://cloudinary.com/console) 'a gidin
2. **Media Library** > **favorikoz** > **products** klasörünü açın
3. Görselleri görüntüleyin, düzenleyin veya silin

---

## 🎓 Daha Fazla Bilgi

- [Cloudinary Docs](https://cloudinary.com/documentation)
- [Next.js + Cloudinary](https://next.cloudinary.dev/)
- [Cloudinary Upload API](https://cloudinary.com/documentation/upload_images)

---

## 💡 İpuçları

1. **Performans:** Cloudinary CDN kullandığı için görseller dünya genelinde hızlı yüklenir
2. **Optimizasyon:** Auto format/quality sayesinde görseller otomatik olarak optimize edilir
3. **Backup:** Cloudinary, yüklenen tüm görselleri güvenli bir şekilde saklar
4. **Transformasyon:** Dashboard'dan görselleri crop, resize, filter gibi işlemlerle düzenleyebilirsiniz

---

**🎉 Cloudinary entegrasyonu tamamlandı! Artık görsel yükleyebilirsiniz.**

