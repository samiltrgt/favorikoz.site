# 🚀 Hızlı Başlangıç - Environment Variables

## ⚠️ ÖNEMLİ: `.env.local` Dosyasını Doldur!

Şu an `.env.local` dosyanda **placeholder değerler** var. Gerçek değerleri girmen gerekiyor:

---

## 📝 Adım Adım Kurulum

### 1️⃣ Supabase Hesabı Aç (5 dakika)

1. [https://app.supabase.com](https://app.supabase.com) → **Sign Up** (ücretsiz)
2. **New Project** tıkla
3. Proje adı: `favorikoz` (veya istediğin isim)
4. Database şifresi: Güçlü bir şifre belirle (kaydet!)
5. Region: **Southeast Asia (Singapore)** (Türkiye'ye en yakın)
6. **Create Project** → Bekle (1-2 dakika)

### 2️⃣ Supabase Keys'leri Al

Proje oluşturulunca:

1. **Settings** (sol menü en altta)
2. **API** sekmesi
3. Şunları kopyala:

```
Project URL:
https://abcdefghijk.supabase.co  ← Bunu kopyala

Project API keys > anon/public:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...  ← Bunu kopyala

Project API keys > service_role:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...  ← Bunu kopyala
```

### 3️⃣ `.env.local` Dosyasını Düzenle

`.env.local` dosyasını text editörde aç ve değiştir:

**ÖNCE (placeholder):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**SONRA (gerçek değerler):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTg0MjM0NTYsImV4cCI6MjAxMzk5OTQ1Nn0.uzLxCXYZ12345...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5ODQyMzQ1NiwiZXhwIjoyMDEzOTk5NDU2fQ.abcDEF123...
```

### 4️⃣ iyzico Keys (Opsiyonel - Ödeme için)

Şimdilik test modunda çalışabilir, gerçek key'lere ihtiyacın yok:

```bash
# Bu satırları olduğu gibi bırakabilirsin
IYZICO_API_KEY=your_api_key_here
IYZICO_SECRET_KEY=your_secret_key_here
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

Ödeme test etmek istersen:
1. [https://merchant.iyzipay.com](https://merchant.iyzipay.com) → **Sign Up** (Test hesabı)
2. **Ayarlar** > **API Bilgileri** > Key'leri kopyala

### 5️⃣ Kaydet ve Sunucuyu Yeniden Başlat

1. `.env.local` dosyasını **kaydet**
2. Terminal'de **Ctrl+C** bas (dev sunucusunu durdur)
3. Tekrar başlat:
```bash
npm run dev
```

---

## 🎯 Hızlı Test

Tarayıcıda aç: [http://localhost:3000](http://localhost:3000)

**Eğer hata alıyorsan:**
- ✅ `.env.local` dosyası kaydedildi mi?
- ✅ Supabase URL doğru kopyalandı mı?
- ✅ Key'ler tam olarak kopyalandı mı? (eksik karakter yok mu?)
- ✅ Dev sunucusu yeniden başlatıldı mı?

---

## 📋 Final `.env.local` Şablonu

Tamamlanmış hali böyle görünmeli:

```bash
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTg0MjM0NTYsImV4cCI6MjAxMzk5OTQ1Nn0.uzLxCXYZ12345abcdefGHIJKLMNOPQRSTUVWXYZ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5ODQyMzQ1NiwiZXhwIjoyMDEzOTk5NDU2fQ.abcDEF123456ghiJKLMNOPQRSTUVWXYZ

# IYZICO (Şimdilik test değerleri)
IYZICO_API_KEY=your_api_key_here
IYZICO_SECRET_KEY=your_secret_key_here
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# APPLICATION
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 🚀 Vercel Deploy İçin

Deploy ederken Vercel **aynı değerleri** soracak. Yukarıdaki değerleri kopyala yapıştır!

**Sadece şunu değiştir:**
```bash
# Local'de:
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Vercel'de (deploy sonrası):
NEXT_PUBLIC_BASE_URL=https://favorikoz.vercel.app
```

---

## ✅ Kontrol Listesi

- [ ] Supabase hesabı oluşturuldu
- [ ] Supabase projesi oluşturuldu
- [ ] Supabase keys kopyalandı
- [ ] `.env.local` dosyası düzenlendi
- [ ] Keys yapıştırıldı
- [ ] Dosya kaydedildi
- [ ] Dev sunucusu yeniden başlatıldı
- [ ] Site açıldı ve çalışıyor

---

**5 dakikada hazır! 🎉**

