# 🚀 Supabase Migration Guide - Favori Kozmetik

## ✅ Tamamlanan İşlemler

Supabase entegrasyonu için aşağıdaki işlemler tamamlanmıştır:

### 1. ✅ Paket Kurulumları
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - Server-side rendering support
- `tsx` - TypeScript script runner
- `dotenv` - Environment variables

### 2. ✅ Helper Dosyaları
- `src/lib/supabase/client.ts` - Client-side Supabase client
- `src/lib/supabase/server.ts` - Server-side Supabase client
- `src/lib/supabase/database.types.ts` - TypeScript type definitions

### 3. ✅ SQL Migration
- `supabase-migration.sql` - Tüm schema, RLS policies, triggers, seeds

### 4. ✅ API Routes Migration
- `/api/products` - GET (filtreleme, arama) & POST (admin only)
- `/api/products/[id]` - GET, PUT (admin), DELETE (soft delete, admin)
- `/api/admin/login` - Email/password authentication
- `/api/admin/me` - Get current admin user
- `/api/admin/logout` - Sign out

### 5. ✅ Product Migration Script
- `scripts/migrate-to-supabase.ts` - JSON to Supabase migration
- `npm run migrate:products` - Run migration script

### 6. ✅ Admin Panel Updates
- Admin login page now uses email instead of username
- Integrated with Supabase Auth

---

## 📋 Yapılması Gerekenler (Manuel)

### Adım 1: Supabase Projesi Oluşturma

1. [Supabase Dashboard](https://app.supabase.com) adresine gidin
2. **New Project** butonuna tıklayın
3. Proje bilgilerini doldurun:
   - **Name:** favorikoz-site
   - **Database Password:** Güçlü bir şifre belirleyin (kaydedin!)
   - **Region:** Europe West (Ireland) - en yakın bölge
4. **Create new project** butonuna tıklayın
5. Projenin hazır olmasını bekleyin (~2 dakika)

### Adım 2: SQL Migration'ı Çalıştırma

1. Supabase Dashboard'da **SQL Editor** sekmesine gidin
2. **New Query** butonuna tıklayın
3. `supabase-migration.sql` dosyasının içeriğini kopyalayın
4. SQL Editor'a yapıştırın
5. **Run** butonuna tıklayın
6. Hataları kontrol edin (yeşil ✓ işareti görmeli)

### Adım 3: Environment Variables Ayarlama

1. Supabase Dashboard'da **Settings** > **API** sekmesine gidin
2. Aşağıdaki değerleri kopyalayın:
   - **Project URL** (örn: https://xxx.supabase.co)
   - **anon/public key**
   - **service_role key** (⚠️ Gizli tutun!)

3. Proje root dizininde `.env.local` dosyası oluşturun:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# iyzico (mevcut)
IYZICO_API_KEY=your_api_key
IYZICO_SECRET_KEY=your_secret_key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Adım 4: Product Migration (Verileri Taşıma)

1. `.env.local` dosyasının doğru ayarlandığından emin olun
2. Terminal'de şu komutu çalıştırın:

```bash
npm run migrate:products
```

3. Migration ilerlemesini izleyin:
   - ✅ Batch 1: 100 products migrated
   - ✅ Batch 2: 100 products migrated
   - ...
   - ✨ Migration completed!

4. Supabase Dashboard'da **Table Editor** > **products** tablosunu kontrol edin

### Adım 5: Admin User Oluşturma

#### Yöntem 1: SQL ile (Hızlı)

1. Supabase Dashboard'da **SQL Editor** sekmesine gidin
2. Aşağıdaki komutu çalıştırın (email ve şifreyi değiştirin):

```sql
-- 1. Create auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@favorikoz.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 2. Update profile to admin role (trigger will auto-create profile)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@favorikoz.com';
```

#### Yöntem 2: Dashboard ile (Önerilen)

1. Supabase Dashboard'da **Authentication** > **Users** sekmesine gidin
2. **Add user** > **Create new user** butonuna tıklayın
3. Email ve Password girin (örn: `admin@favorikoz.com`)
4. **Auto Confirm User** kutucuğunu işaretleyin
5. **Create user** butonuna tıklayın
6. Oluşturulan kullanıcının ID'sini kopyalayın
7. **SQL Editor**'da şu komutu çalıştırın:

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'KOPYALADIĞINIZ-USER-ID';
```

### Adım 6: Test Etme

1. Development server'ı başlatın:

```bash
npm run dev
```

2. Admin paneline giriş yapın:
   - URL: http://localhost:3000/admin/login
   - Email: admin@favorikoz.com
   - Password: admin123 (veya belirlediğiniz şifre)

3. Ana sayfayı kontrol edin:
   - URL: http://localhost:3000
   - Ürünlerin Supabase'den geldiğini doğrulayın

4. API endpoint'leri test edin:
   - GET http://localhost:3000/api/products
   - GET http://localhost:3000/api/products?category=protez-tirnak
   - GET http://localhost:3000/api/products?search=tırnak

---

## 🔧 Sorun Giderme

### Hata: "Missing Supabase credentials"
- `.env.local` dosyasının root dizinde olduğundan emin olun
- Environment variable'ların doğru isimlendirildiğini kontrol edin
- Development server'ı yeniden başlatın

### Hata: "Failed to fetch products"
- Supabase SQL migration'ının başarılı çalıştığından emin olun
- Browser Console'da detaylı hata mesajını kontrol edin
- Supabase Dashboard > **Table Editor**'da `products` tablosunun var olduğunu doğrulayın

### Hata: "Unauthorized" admin panelinde
- Admin user'ın `profiles.role` değerinin `'admin'` olduğunu kontrol edin:
```sql
SELECT email, role FROM public.profiles WHERE email = 'admin@favorikoz.com';
```

### Hata: "Row Level Security policy violation"
- SQL migration'da RLS policies'in doğru çalıştığından emin olun
- `is_admin()` fonksiyonunun oluşturulduğunu kontrol edin

---

## 📚 Ek Notlar

### Price Conversion
- Database'de fiyatlar **kuruş** cinsinden tutulur (price * 100)
- API'lerde otomatik olarak TL'ye dönüştürülür
- Frontend'de fiyatları değiştirmeye gerek yok

### Soft Delete
- Products DELETE endpoint'i artık **soft delete** yapar
- `deleted_at` timestamp'i set edilir
- Public queries otomatik olarak silinmiş ürünleri hariç tutar

### Admin Access Control
- Tüm admin endpoint'leri Supabase Auth kontrolü yapar
- RLS policies admin olmayan kullanıcıları bloklar
- Client-side ve server-side güvenlik birlikte çalışır

### Next Steps (Opsiyonel)
- [ ] Cloudinary → Supabase Storage migration
- [ ] Cart persistence (user bazlı)
- [ ] Favorites Supabase'e taşıma
- [ ] Orders tablosu entegrasyonu
- [ ] Real-time admin panel updates

---

## 🎉 Tebrikler!

Supabase entegrasyonunuz tamamlandı! Artık:
- ✅ Gerçek veritabanı kullanıyorsunuz
- ✅ Güvenli authentication sisteminiz var
- ✅ Row Level Security ile korunuyorsunuz
- ✅ Scalable bir altyapınız mevcut

Sorularınız için: [Supabase Documentation](https://supabase.com/docs)

