# Vercel'de NES Environment Variables Ekleme

Vercel'de NES fatura için gerekli environment variables'ları eklemen gerekiyor.

---

## 📋 Adım Adım

### 1. Vercel Dashboard'a Git

1. https://vercel.com/dashboard adresine git
2. Projeni bul ve tıkla (favorikoz.site veya favorikozmetik.com)

### 2. Settings → Environment Variables

1. Üst menüden **Settings** sekmesine tıkla
2. Sol menüden **Environment Variables** seçeneğine tıkla

### 3. Şu 3 Değişkeni Ekle

Aşağıdaki **3 değişkeni** tek tek ekle. Her birini eklerken:

- **Key:** (aşağıdaki isimlerden biri)
- **Value:** (aşağıdaki değerlerden biri - `.env.local` dosyandaki değerler)
- **Environment:** **Production, Preview, Development** → **Hepsini seç** (üçünü de işaretle)

---

### ✅ Eklenecek Değişkenler:

#### 1️⃣ NES_API_BASE_URL
- **Key:** `NES_API_BASE_URL`
- **Value:** `https://apitest.nes.com.tr`
- **Environment:** Production, Preview, Development (hepsi)

#### 2️⃣ NES_API_KEY
- **Key:** `NES_API_KEY`
- **Value:** `706C9BB3102BEB103EE1210DE0F4478FB2ED051730618EA40CDFCEEFAAC5F5A3`
- **Environment:** Production, Preview, Development (hepsi)

#### 3️⃣ NES_MARKETPLACE_ID
- **Key:** `NES_MARKETPLACE_ID`
- **Value:** `d3557de7-07ca-43ee-bde7-ae4f45a658f8`
- **Environment:** Production, Preview, Development (hepsi)

---

## ⚠️ Önemli Notlar

1. **Her değişkeni ekledikten sonra** "Save" butonuna tıkla
2. **Environment seçimi:** Her değişken için **Production, Preview, Development** üçünü de seçmelisin (yoksa bazı ortamlarda çalışmaz)
3. **Deploy gerekli:** Environment variables ekledikten sonra Vercel otomatik olarak yeni bir deploy başlatır. Bekle veya manuel olarak "Redeploy" yapabilirsin

---

## ✅ Kontrol Et

Environment variables ekledikten ve deploy tamamlandıktan sonra:

1. **API endpoint'i kontrol et:**
   ```
   https://www.favorikozmetik.com/api/nes/status
   ```
   Beklenen yanıt:
   ```json
   {
     "success": true,
     "nesConfigured": true,
     "message": "NES e-arşiv yapılandırıldı; ödeme başarılı olunca fatura kesilecek."
   }
   ```

2. **Yeni bir test siparişi oluştur** ve ödeme yap. Loglarda şunu görmelisin:
   ```
   [payment/status] NES fatura oluşturuluyor: ORD-XXXXX
   ✅ NES e-arşiv fatura oluşturuldu: ORD-XXXXX <uuid>
   ```

---

## 🔄 Deploy Sonrası

Environment variables ekledikten sonra Vercel otomatik deploy başlatır. Eğer başlatmazsa:

1. **Deployments** sekmesine git
2. En son deploy'ın yanındaki **"..."** menüsüne tıkla
3. **"Redeploy"** seçeneğini tıkla

Deploy tamamlandıktan sonra yukarıdaki kontrol adımlarını yap.

---

## 📝 Diğer Environment Variables

Eğer Vercel'de diğer değişkenler de eksikse (Supabase, Iyzico vb.), onları da ekle:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IYZICO_API_KEY`
- `IYZICO_SECRET_KEY`
- `IYZICO_BASE_URL`
- `NEXT_PUBLIC_BASE_URL`

Ama şu an sadece NES değişkenlerini eklemen yeterli (diğerleri muhtemelen zaten ekli).
