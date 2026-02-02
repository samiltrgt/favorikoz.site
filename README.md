# Favorikoz Site

Modern e-ticaret sitesi - Next.js, TypeScript ve Tailwind CSS ile geliştirilmiştir.

## 🚀 Özellikler

- **Next.js 14** - App Router ile modern React framework
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Responsive ve modern tasarım
- **Cloudinary** - Görsel yönetimi
- **Iyzico** - Ödeme entegrasyonu (Mock)
- **Responsive Design** - Mobil uyumlu
- **Admin Panel** - Ürün yönetimi
- **Sepet Sistemi** - Local storage tabanlı
- **Favoriler** - Ürün favorileme

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Production build
npm run build
npm start
```

**Not:** `npm install` sırasında `rimraf`, `glob`, `inflight`, `eslint` vb. için “deprecated” uyarıları görebilirsiniz. Bunlar Next.js ve ESLint’in kullandığı dolaylı bağımlılıklardan gelir; projeyi bozmaz. Uyarıları yok sayabilir veya ileride Next.js / ESLint güncellemeleriyle azalmasını bekleyebilirsiniz.

## 🔧 Konfigürasyon

### Environment Variables

`.env.local` dosyası oluşturun:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
NEXT_PUBLIC_CLOUDINARY_API_SECRET=your_api_secret
```

### Cloudinary Setup

1. [Cloudinary](https://cloudinary.com) hesabı oluşturun
2. Dashboard'dan API bilgilerini alın
3. Environment variables'ı ayarlayın

## 📁 Proje Yapısı

```
src/
├── app/                 # Next.js App Router
│   ├── admin/           # Admin paneli
│   ├── api/             # API routes
│   ├── checkout/        # Ödeme sayfası
│   ├── sepet/           # Sepet sayfası
│   ├── cok-satanlar/    # Çok satanlar sayfası
│   ├── tum-urunler/     # Tüm ürünler sayfası
│   ├── kategori/        # Kategori sayfaları
│   └── urun/            # Ürün detay sayfaları
├── components/          # React bileşenleri
└── lib/                 # Yardımcı fonksiyonlar

data/
└── products.json        # Ürün veritabanı

public/
└── images/              # Statik görseller
```

## 🛠️ Geliştirme

### Scripts

- `npm run dev` - Geliştirme sunucusu
- `npm run build` - Production build
- `npm run start` - Production sunucusu
- `npm run lint` - ESLint kontrolü

### Veri Yönetimi

Ürün verileri `data/products.json` dosyasında tutulur. Admin paneli üzerinden yönetilebilir.

## 🚀 Deployment

### Vercel

1. GitHub repository'sini Vercel'e bağlayın
2. Environment variables'ı ayarlayın
3. Deploy edin

### Environment Variables (Vercel)

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_API_KEY`
- `NEXT_PUBLIC_CLOUDINARY_API_SECRET`

## 📝 Lisans

Bu proje özel kullanım içindir.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

Proje hakkında sorularınız için iletişime geçin.

## 🔄 Güncelleme

### GitHub Üzerinden Otomatik Güncelleme

1. Local'de değişiklikleri yapın
2. GitHub Desktop'ta commit + push yapın
3. Vercel otomatik deploy eder

### Manuel Deploy

1. Vercel Dashboard > Redeploy
2. Son commit'i seçin
3. Deploy edin