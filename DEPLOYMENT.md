# 🚀 GitHub & Vercel Deployment Guide

## 📋 Ön Gereksinimler

- GitHub hesabı
- Vercel hesabı
- GitHub Desktop (opsiyonel)

## 🔧 Adım 1: GitHub Repository Oluşturma

### GitHub Web'de:
1. **GitHub.com'a gidin**
2. **"New repository" tıklayın**
3. **Repository name**: `favorikoz-site`
4. **Description**: `Modern e-ticaret sitesi - Next.js, TypeScript, Tailwind CSS`
5. **Public** seçin
6. **"Create repository" tıklayın**

### GitHub Desktop ile:
1. **GitHub Desktop'ı açın**
2. **"Clone a repository from the Internet" tıklayın**
3. **Repository URL**: `https://github.com/yourusername/favorikoz-site.git`
4. **Local path**: `C:\Users\Lenovo\Desktop\favorikoz-site-github`
5. **"Clone" tıklayın**

## 📁 Adım 2: Dosyaları Kopyalama

### Windows Explorer ile:
1. **Kaynak**: `C:\Users\Lenovo\Desktop\favorikoz.site` (mevcut proje)
2. **Hedef**: `C:\Users\Lenovo\Desktop\favorikoz-site-github` (GitHub clone)
3. **Tüm dosyaları kopyalayın**:
   - `src/` klasörü
   - `data/` klasörü
   - `public/` klasörü
   - `scripts/` klasörü
   - `package.json`
   - `package-lock.json`
   - `next.config.js`
   - `tailwind.config.js`
   - `tsconfig.json`
   - `postcss.config.js`
   - `middleware.ts`
   - `vercel.json`
   - `.gitignore`
   - `README.md`
   - `CLOUDINARY.md`
   - `DEPLOYMENT.md`
   - `PAYMENTS.md`
   - `.env.local.example`

## 💾 Adım 3: GitHub'a Push

### GitHub Desktop ile:
1. **GitHub Desktop'ta**:
   - **"Summary"**: `Initial commit - Complete project files`
   - **"Commit to main" tıklayın**
   - **"Push origin" tıklayın**

### Git CLI ile:
```bash
git add .
git commit -m "Initial commit - Complete project files"
git push origin main
```

## 🚀 Adım 4: Vercel Deployment

### Vercel'e Bağla:
1. **Vercel Dashboard'a gidin**
2. **"New Project" tıklayın**
3. **GitHub repository'sini seçin**
4. **"Import" tıklayın**

### Konfigürasyon:
1. **Framework Preset**: Next.js
2. **Root Directory**: `.` (boş bırakın)
3. **Build Command**: `npm run build`
4. **Output Directory**: `.next`
5. **Install Command**: `npm install`

### Environment Variables:
Vercel Dashboard > Settings > Environment Variables:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
NEXT_PUBLIC_CLOUDINARY_API_SECRET=your_api_secret
```

### Deploy:
1. **"Deploy" tıklayın**
2. **Build tamamlanana kadar bekleyin**
3. **Site URL'ini alın**

## 🔄 Adım 5: Güncelleme Süreci

### Otomatik Güncelleme:
1. **Local'de değişiklikleri yapın**
2. **GitHub Desktop'ta commit + push yapın**
3. **Vercel otomatik deploy eder**

### Manuel Deploy:
1. **Vercel Dashboard > Deployments**
2. **"Redeploy" tıklayın**
3. **Son commit'i seçin**

## 🔧 Troubleshooting

### "No Next.js version detected" Hatası:
- **Root Directory**: `.` olarak ayarlayın
- **package.json** root seviyede olduğundan emin olun

### Build Hatası:
- **Environment variables** doğru ayarlandığından emin olun
- **Node.js version** 18+ olduğundan emin olun

### Cloudinary Hatası:
- **API keys** doğru olduğundan emin olun
- **next.config.js** Cloudinary domain'i eklenmiş olduğundan emin olun

## ✅ Checklist

- [ ] GitHub repository oluşturuldu
- [ ] Dosyalar root seviyeye kopyalandı
- [ ] GitHub'a push yapıldı
- [ ] Vercel'e bağlandı
- [ ] Environment variables ayarlandı
- [ ] Deploy başarılı
- [ ] Site çalışıyor

## 📞 Destek

Sorun yaşarsanız:
1. **Build logs** kontrol edin
2. **Environment variables** kontrol edin
3. **Root Directory** ayarını kontrol edin
4. **package.json** root seviyede olduğundan emin olun

## 🎯 Sonuç

Bu adımları takip ederek:
- ✅ **GitHub repository** hazır
- ✅ **Vercel deployment** başarılı
- ✅ **Otomatik güncelleme** çalışıyor
- ✅ **Site canlı** ve erişilebilir