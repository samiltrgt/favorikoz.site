# 🔐 Environment Variables Setup

## 📋 Tüm Environment Variables (Tek Liste)

### ✅ Zorunlu Değişkenler

```bash
# ==============================================
# SUPABASE (Database & Authentication)
# ==============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==============================================
# IYZICO PAYMENTS
# ==============================================
IYZICO_API_KEY=your_api_key_here
IYZICO_SECRET_KEY=your_secret_key_here
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# ==============================================
# APPLICATION
# ==============================================
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 🚀 Kurulum Adımları

### 1️⃣ Local Development İçin

1. Proje root dizininde `.env.local` dosyası oluştur
2. Yukarıdaki tüm değişkenleri kopyala
3. Değerleri doldur:
   - **Supabase:** [Supabase Dashboard](https://app.supabase.com) > Settings > API
   - **iyzico:** [iyzico Dashboard](https://merchant.iyzipay.com)
   - **Base URL:** `http://localhost:3000` (local için)

4. Kaydet ve geliştirmeye başla!

```bash
npm run dev
```

---

### 2️⃣ Vercel (Production) İçin

Vercel Dashboard'da **Settings** > **Environment Variables** bölümünde:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` ⚠️ | Production, Preview, Development |
| `IYZICO_API_KEY` | `your_api_key` | Production, Preview, Development |
| `IYZICO_SECRET_KEY` | `your_secret_key` ⚠️ | Production, Preview, Development |
| `IYZICO_BASE_URL` | `https://api.iyzipay.com` | Production |
| `IYZICO_BASE_URL` | `https://sandbox-api.iyzipay.com` | Preview, Development |
| `NEXT_PUBLIC_BASE_URL` | `https://your-domain.vercel.app` | Production |

⚠️ **Önemli:** Deploy'dan sonra **Redeploy** etmeyi unutma!

---

## 🔑 Key'leri Nereden Alırsın?

### Supabase Keys

1. [Supabase Dashboard](https://app.supabase.com)
2. Projenizi seçin
3. **Settings** (sol menü en altta) > **API**
4. Kopyala:
   ```
   Project URL        → NEXT_PUBLIC_SUPABASE_URL
   anon/public key    → NEXT_PUBLIC_SUPABASE_ANON_KEY
   service_role key   → SUPABASE_SERVICE_ROLE_KEY ⚠️ GİZLİ!
   ```

### iyzico Keys

1. [iyzico Merchant Dashboard](https://merchant.iyzipay.com)
2. **Ayarlar** > **API Bilgileri**
3. Kopyala:
   ```
   API Key            → IYZICO_API_KEY
   Secret Key         → IYZICO_SECRET_KEY ⚠️ GİZLİ!
   ```

**Test için:** Sandbox modda başla!
**Canlıya geçerken:** `IYZICO_BASE_URL`'i production'a değiştir

---

## 📝 Ortam Bazlı Değerler

### Local Development
```bash
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Vercel Preview (Test)
```bash
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
NEXT_PUBLIC_BASE_URL=https://your-project-git-branch.vercel.app
```

### Vercel Production (Canlı)
```bash
IYZICO_BASE_URL=https://api.iyzipay.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

---

## 🔒 Güvenlik Notları

1. **Asla GitHub'a yükleme:**
   - `.env.local` dosyası `.gitignore`'da
   - Keyleri kod içine yazmayın

2. **NEXT_PUBLIC_ Prefix:**
   - ✅ `NEXT_PUBLIC_` ile başlayanlar browser'da görünür
   - ⚠️ Hassas bilgiler için kullanma!
   - ✅ Sadece public URL'ler için kullan

3. **Service Role Key:**
   - ⚠️ Çok güçlü yetkiler
   - ⚠️ Sadece server-side kullan
   - ⚠️ Asla client-side'da kullanma!

4. **iyzico Keys:**
   - ⚠️ Secret key'i kimseyle paylaşma
   - ✅ İlk başta sandbox kullan
   - ✅ Test etmeden production'a geçme

---

## ✅ Kontrol Listesi

Herşeyin doğru çalıştığını kontrol et:

### Local Development:
- [ ] `.env.local` dosyası oluşturuldu
- [ ] Tüm değişkenler dolduruldu
- [ ] Supabase bağlantısı çalışıyor
- [ ] Admin login yapılabiliyor
- [ ] Ürünler listeleniyor

### Vercel Production:
- [ ] Tüm env variables eklendi
- [ ] Production, Preview, Development seçildi
- [ ] Redeploy yapıldı
- [ ] Site açılıyor
- [ ] Database bağlantısı çalışıyor
- [ ] iyzico test ödemesi yapıldı
- [ ] Domain ayarlandıysa `NEXT_PUBLIC_BASE_URL` güncellendi

---

## 🆘 Sorun Giderme

### "Supabase connection failed"
- ✅ URL doğru mu? `https://` ile başlıyor mu?
- ✅ Anon key kopyalanırken bozuldu mu?
- ✅ Supabase projeniz aktif mi?

### "iyzico error"
- ✅ Test için sandbox URL kullanıyor musun?
- ✅ API key ve secret key doğru mu?
- ✅ Base URL'de typo var mı?

### "Environment variable undefined"
- ✅ Vercel'de variable ekledin mi?
- ✅ Redeploy yaptın mı?
- ✅ `NEXT_PUBLIC_` prefix'i doğru mu?

---

## 📚 İlgili Dosyalar

- `SUPABASE_SETUP.md` - Supabase kurulum detayları
- `PAYMENTS.md` - iyzico entegrasyon detayları
- `DEPLOYMENT.md` - Vercel deployment detayları

---

**Son Güncelleme:** 22 Ekim 2025

