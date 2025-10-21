# Supabase Setup Guide - Favori Kozmetik

## 🎯 Quick Start

Supabase entegrasyonu tamamlanmıştır! Aşağıdaki adımları takip edin:

### 1. Supabase Projesi Oluşturun
[Supabase Dashboard](https://app.supabase.com) → New Project

### 2. SQL Migration'ı Çalıştırın
Supabase SQL Editor'da `supabase-migration.sql` dosyasını çalıştırın

### 3. Environment Variables Ayarlayın
`.env.local` dosyası oluşturun:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# iyzico Payments
IYZICO_API_KEY=your_api_key
IYZICO_SECRET_KEY=your_secret_key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# Analytics (Optional)
GA4_ID=G-XXXXXXX
```

### 4. Verileri Migrate Edin
```bash
npm run migrate:products
```

### 5. Admin User Oluşturun
Supabase Dashboard → Authentication → Add User

Sonra SQL Editor'da:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

### 6. Test Edin
```bash
npm run dev
```

---

## 📚 Detaylı Kılavuz

Adım adım detaylı talimatlar için `SUPABASE_MIGRATION_GUIDE.md` dosyasına bakın.

## 🔑 Supabase Keys Nereden Alınır?

1. [Supabase Dashboard](https://app.supabase.com)
2. Projenizi seçin
3. **Settings** > **API** sekmesine gidin
4. Şunları kopyalayın:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Gizli!

## 📋 Dosya Yapısı

```
supabase-migration.sql          # SQL schema + RLS + seeds
scripts/migrate-to-supabase.ts  # Product data migration
src/lib/supabase/
  ├── client.ts                 # Client-side helper
  ├── server.ts                 # Server-side helper
  └── database.types.ts         # TypeScript types
```

## ✅ Entegre Edilen Özellikler

- ✅ Products CRUD with RLS
- ✅ Admin authentication with Supabase Auth
- ✅ Soft delete support
- ✅ Search & filtering
- ✅ Price conversion (kuruş ↔ TL)
- ✅ Admin role-based access control

## 🚀 Deployment (Vercel)

Vercel Environment Variables'a şunları ekleyin:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## 🛟 Yardım

Sorun yaşıyorsanız:
1. `SUPABASE_MIGRATION_GUIDE.md` → Sorun Giderme bölümü
2. Browser Console → Network tab
3. Supabase Dashboard → Logs

