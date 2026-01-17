# 🔄 Migration: Protez Tırnak → Tırnak

Bu migration, `protez-tirnak` kategorisindeki tüm ürünleri `tirnak` kategorisine taşır.

## 📋 Yapılan Değişiklikler

### 1. Veritabanı Migration
- `protez-tirnak` kategorisindeki tüm ürünlerin `category_slug` değeri `tirnak` olarak güncellenir
- `tirnak` kategorisi yoksa otomatik oluşturulur

### 2. Kod Referansları Güncellendi
- ✅ `src/components/hero-section.tsx` - Hero section linki
- ✅ `src/components/home-banners.tsx` - Home banner linki
- ✅ `src/app/admin/products/new/page.tsx` - Admin ürün ekleme formu
- ✅ `src/app/admin/products/[id]/edit/page.tsx` - Admin ürün düzenleme formu
- ✅ `src/app/admin/promo-banners/page.tsx` - Promo banner varsayılan linki

## 🚀 Migration'ı Çalıştırma

### Yöntem 1: Node.js Script (Önerilen)

```bash
npm run migrate:protez-tirnak
```

veya

```bash
npx tsx scripts/migrate-protez-tirnak-to-tirnak.ts
```

### Yöntem 2: SQL Script

Supabase Dashboard'da SQL Editor'ü açın ve `migrate-protez-tirnak-to-tirnak.sql` dosyasının içeriğini çalıştırın.

## ✅ Kontrol

Migration'dan sonra kontrol etmek için:

```sql
-- "tirnak" kategorisindeki ürün sayısı
SELECT COUNT(*) FROM products 
WHERE category_slug = 'tirnak' AND deleted_at IS NULL;

-- "protez-tirnak" kategorisinde kalan ürün var mı?
SELECT COUNT(*) FROM products 
WHERE category_slug = 'protez-tirnak' AND deleted_at IS NULL;
```

## ⚠️ Notlar

- Migration sadece silinmemiş ürünleri taşır (`deleted_at IS NULL`)
- `protez-tirnak` kategorisi veritabanında kalır (sadece ürünler taşınır)
- Eğer `protez-tirnak` kategorisini tamamen kaldırmak isterseniz, önce tüm ürünlerin taşındığından emin olun

## 📝 Sonraki Adımlar

1. Migration'ı çalıştırın
2. Veritabanını kontrol edin
3. Sitede `/kategori/tirnak` sayfasının çalıştığını test edin
4. (Opsiyonel) `protez-tirnak` kategorisini veritabanından kaldırın

