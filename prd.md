# PRD — Favori Kozmetik E‑Ticaret Sitesi

> Sürüm: 1.0 — Tarih: 22 Ağustos 2025
> Hazırlayan: \_\_\_\_\_\_
> Amaç: ToksoyKozmetik benzeri B2C kozmetik mağazası; premium görünüm, hızlı, mobil öncelikli, pazaryeri senkronize.

---

## 1) Arka Plan & Vizyon

* **İş hedefi:** Favori Kozmetik markası için doğrudan satış (D2C) kanalı oluşturmak, pazaryeri bağımlılığını azaltmak, marjı artırmak.
* **Kilit çıktılar:** Yüksek dönüşüm (CVR), hızlı sayfalar (LCP ≤ 2.5s), SEO görünürlüğü, güven veren hukuk sayfaları, kolay ödeme.
* **Referans:** ToksoyKozmetik’te görülen geniş kategori yapısı, filtreleme, “Favorilerim”, ücretsiz kargo eşiği ve politikalar benzeri kullanıcı güveni öğeleri hedeflenir.

## 2) Kapsam (Scope)

**Dahil**

* Ana sayfa, kategori, ürün detay, arama, marka sayfaları
* Sepet, kasa/checkout (iyzico/alternatif), hesap alanı, favoriler
* İçerik sayfaları (Hakkımızda, İletişim, KVKK, Gizlilik, İade/Değişim, Çerez Politikası, Güvenli Alışveriş)
* Kampanya bileşenleri (banner, rozetler, ücretsiz kargo eşiği, çok satanlar)
* Stok/ varyant/ fiyat yönetimi, kuponlar
* GA4 + Meta Pixel + Hotjar (opsiyon) & temel olay planı
* Temel CRM: bülten kaydı, terk edilmiş sepet e‑postası (3. partiyle)

**Hariç (V1’de yok)**

* Çoklu mağaza/çoklu dil
* Kurumsal (B2B) fiyat listeleri
* Geniş içerik (blog) — V2’ye bırakılabilir

## 3) Hedef Kitle & Personalar

* **Pro Müşteri:** Kuaför/beauty center; toplu alım, hızlı stok takibi.
* **Son Kullanıcı:** Evde kişisel bakım; basit arama, hızlı ödeme.
* **Pazaryeri Geçişi:** Trendyol’dan gelen ziyaretçi; güven ve fiyat/teslimat beklentisi yüksek.

## 4) Başarı Kriterleri (KPI)

* **CVR:** ≥ %2,5 (mobile) / ≥ %3,0 (desktop) — 60 gün içinde
* **Pagespeed (mobile):** LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms
* **Sepet Terk Oranı:** ≤ %70
* **Organik Trafik:** 3. ay sonunda marka dışı anahtar kelimelerden ilk 50 oturum/gün
* **İade Oranı:** ≤ %8

## 5) Bilgi Mimarisi & Navigasyon

**Üst Menü (örnek):**

* Protez Tırnak, Kalıcı Makyaj & Microblading, İpek Kirpik, Kişisel Bakım, Makyaj, Saç Bakımı, Erkek Bakım, Kuaför & Güzellik Merkezleri
* Yardım: Hakkımızda, İletişim
* Ara, Hesabım, Sepet, **Favoriler**

**Kategori Sayfası**

* Filtreler: Fiyat, Marka, Stok, Değerlendirme, İndirim
* Sıralama: Son eklenen, A‑Z/Z‑A, Fiyat ↑/↓, İndirim oranı ↑/↓, En çok satanlar, En çok değerlendirilen
* Listeleme: 2‑4 sütun; ürün kartında görsel, marka, ürün adı, fiyat, stok rozeti, "Sepete Ekle" / "Ürünü İncele"

**Ürün Detay**

* Galeri/zoom, başlık, SKU, marka, fiyat, taksit, stok, varyantlar
* Kargo & iade ikonları (ör. **2000 TL+ ücretsiz kargo**, **10 gün iade/değişim**)
* Açıklama, öne çıkan özellikler, içerik/INCI (varsa), yorumlar
* Çapraz satış: "Birlikte Alın", "Çok Satanlar"

## 6) Kullanıcı Hikâyeleri (User Stories)

* **Arama:** “Toz wax” aradığımda alakalı kategori/ürün önerileri görürüm (otomatik tamamlama).
* **Filtre:** “Protez tırnak”ta marka=Staleks ve fiyat<1000 TL filtreleyip ürünleri görebilirim.
* **Favori:** Ürün kartından kalp ikonuyla favoriye ekleyebilirim.
* **Ödeme:** Misafir/üye girişi ile **iyzico** 3D Secure üzerinden kredi/banka kartıyla ödeme yapabilirim.
* **İade Bilgisi:** Ürün detayda iade/kargo koşullarını hızlıca görebilirim.
* **Hesabım:** Sipariş geçmişimi ve iade taleplerimi yönetebilirim.
* **Bülten:** Footer’dan e‑posta bültenine abone olurum.

## 7) Fonksiyonel Gereksinimler

### 7.1 Katalog & Stok

* Kategori/alt kategori/marka sayfaları
* Ürün: başlık, açıklama, teknik özellikler, fiyat, kampanya, KDV, stok, barkod, görseller (WebP/AVIF), varyant (renk/gramaj)
* Toplu içe/dışa aktarım (CSV/Excel), GTIN/Barcode alanları
* "Çok satan", "Yeni", "İndirim" rozetleri (kural tabanlı)

### 7.2 Sepet & Ödeme

* Sepette: kupon kodu, kargo bedeli, ücretsiz kargo eşiği göstergesi
* Checkout adımları: adres → kargo → ödeme → özet
* **Ödeme altyapısı:** iyzico (TR kartları, taksit, 3D Secure, iade/iptal), alternatif olarak PayTR/Stripe (opsiyon)
* Fatura/efatura entegrasyonuna hazır mimari (V2)

### 7.3 Üyelik & Favoriler

* Üyelik oluşturma, e‑posta doğrulama
* Favori listesi, stok gelince e‑posta bildirimi
* Adres defteri, sipariş takibi

### 7.4 Arama & Keşif

* Header aramada otomatik tamamlama (ürün, kategori, marka)
* Hatalı yazım toleransı
* Popüler aramalar/etiketler

### 7.5 İçerik & Hukuk

* Statik sayfalar: Hakkımızda, İletişim (harita/WhatsApp), KVKK, Gizlilik, Güvenli Alışveriş, Cayma/İade/İptal, Çerez Politikası, İşlem Rehberi
* SSS (kargo, iade, ödeme, bakım ürünleri kullanımı)

### 7.6 Pazarlama & Kampanya

* Ana sayfada hero slider, kampanya banner’ları
* Bülten aboneliği (Mailchimp/Brevo)
* Kupon/indirim motoru (yüzde, tutar, kargo ücretsiz)

## 8) Performans & Kalite Kriterleri (NFR)

* **Core Web Vitals:** LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms (4G, orta seviye cihaz)
* **Erişilebilirlik:** WCAG 2.2 AA; kontrast ≥ 4.5:1; klavye navigasyonu
* **SEO:** Semantik HTML, schema.org Product/Breadcrumb, hreflang (tek dil V1), OpenGraph
* **Güvenlik:** HTTPS zorunlu, HSTS, içerik güvenlik politikası (CSP), 3D Secure
* **KVKK & Çerez:** Açık rıza, tercih yönetimi, gizlilik metinleri
* **Uptime:** ≥ %99,5 (aylık)
* **Görüntü:** next/image benzeri otomatik optimizasyon, lazy‑load

## 9) Tasarım Sistemi

* **Aesthetic:** Minimal, editorial; off‑white arkaplan, koyu gri metin; yumuşak gölgeler, geniş beyaz alanlar
* **Tipografi:** Başlık (serif — Playfair Display), Gövde/UI (sans — Inter)
* **Komponentler:** Header (sticky), Mega menu, Ürün kartı, Rozetler, Paginasyon, Toast, Modal, Stepper checkout

## 10) Analitik & Ölçümleme (GA4 Olay Planı)

* `view_item_list` (kategori), `view_item` (ürün), `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`
* Ek özel eventler: `search` (query), `apply_coupon`, `newsletter_signup`, `add_to_favorites`, `login_success`
* **Raporlar:** Funnel, sepet terk, kampanya verimliliği, ürün performansı

## 11) Entegrasyonlar

* **Ödeme:** iyzico (V1)
* **Kargo:** Yurtiçi/Sürat/MNG (takip linki alanı)
* **CDN/Depolama:** Cloudflare Images/R2 (opsiyon)
* **Pazaryeri Senk.:** Trendyol ürün feed’i (V2)
* **E‑posta:** Brevo/Mailchimp (bülten & terk sepet)

## 12) Teknoloji Tercihi (öneri)

* **Front‑end:** Next.js (App Router), TypeScript, Tailwind, shadcn/ui
* **Arama:** Algolia/Meilisearch (opsiyonel V2), V1 için basit title/brand match
* **Veritabanı:** PostgreSQL (Prisma) veya hazır e‑ticaret SaaS (ikas/Shopify)
* **Barındırma:** Vercel
* **Yönetim Paneli:** Headless (Strapi/Sanity) **veya** seçilen SaaS’ın admini
* **CI/CD:** GitHub + Vercel

## 13) İçerik & SEO Stratejisi

* **Kategori landing** metinleri (≥ 120‑180 kelime)
* Ürün başlık şablonu: *Marka + Ürün + Özellik + Boy/Gramaj*
* Meta: Title ≤ 60, Description ≤ 155; canonical
* Dahili linkler: Çok satanlar, ilgili kategoriler
* V2: Blog (soru‑cevap içerikleri, kullanım rehberleri)

## 14) Hukuki Sayfalar & Güven Öğeleri

* KVKK, Gizlilik ve Güvenlik, Çerez Politikası, Cayma/İptal/İade, Kullanım Şartları
* Footer’da ödeme ikonları (Visa/Mastercard), güven rozetleri, açık telefon/e‑posta/adres
* **Ücretsiz kargo eşiği** (örn. 2000 TL) yapılandırılabilir

## 15) Kabul Kriterleri (Örnekler)

* [ ] Mobilde 320‑393px ekranlarda header ve arama sorunsuz
* [ ] Kategori filtresi aynı anda çoklu marka + fiyat aralığını destekler
* [ ] Ürün detayda en az 4 görsel ve zoom
* [ ] Sepet sayfasında **kargo eşiği progress bar**
* [ ] iyzico test ortamında başarılı/sorunlu ödeme senaryoları
* [ ] GA4’de `purchase` event’i doğru gelir, gelir/para birimi doğru
* [ ] KVKK ve Çerez banner’ı ilk ziyaretçi oturumunda çıkar ve tercih kaydeder

## 16) İçerik Gereksinimleri (V1)

* 8 üst kategori, 50+ marka etiketi, 150+ ürün
* Ana sayfa: 1 hero slider (2‑3 görsel), 3 kampanya bloğu, 12 çok satan ürün
* Her kategori için 1 banner + 120 kelimelik SEO metni

## 17) Operasyon & Yönetim

* **Roller:** Admin, Editör, Müşteri Temsilcisi
* **SLA:** Müşteri e‑postalarına 24 saat içinde dönüş
* **İade Süreci:** Panelden iade talebi; onay→kargo→iade/değişim

## 18) Zaman Çizelgesi (öneri)

* **Hafta 1:** Tasarım sistemi, IA, ana sayfa & PLP wireframe
* **Hafta 2‑3:** Katalog modeli, PDP, sepet/checkout
* **Hafta 4:** Entegrasyonlar (iyzico, GA4), içerik girişi
* **Hafta 5:** Testler, SEO, performans, go‑live

## 19) Riskler & Azaltım

* **Ödeme entegrasyonu gecikmesi:** Test ortamı ile erken entegrasyon
* **Görsel eksikliği:** Geçici stok görselleri, fotoğraf çekim planı
* **Performans düşüşü:** Görsel optimizasyon, CDN, kod bölme, önbellek

## 20) Açık Sorular

* Ücretsiz kargo eşiği kesin tutar?
* Taksit/komisyon yansıtma politikası?
* Pazaryeri feed senkronu V1’e dahil edilecek mi?

---

### Ek: Cursor/Repo Yapı Önerisi

```
root
└─ apps/web (Next.js)
   ├─ app/(shop)/[locale]/
   │  ├─ page.tsx (Home)
   │  ├─ kategori/[slug]/page.tsx (PLP)
   │  ├─ urun/[slug]/page.tsx (PDP)
   │  ├─ sepet/page.tsx
   │  └─ odeme/page.tsx
   ├─ components/ (Card, Price, Rating, Badge, AddToCart, Breadcrumbs)
   ├─ lib/ (analytics, seo, constants)
   ├─ styles/ (globals.css)
   └─ public/
```

### Ek: GA4 Etkinlik Haritası (Özet)

| Event              | Parametreler                          | Tetikleyici          |
| ------------------ | ------------------------------------- | -------------------- |
| view\_item\_list   | item\_list\_id, item\_list\_name      | Kategori listeleme   |
| view\_item         | item\_id, item\_name, price           | Ürün detay           |
| add\_to\_cart      | currency, value, items\[]             | Sepete Ekle butonu   |
| begin\_checkout    | step                                  | Ödeme akışı başı     |
| add\_payment\_info | payment\_type                         | Ödeme yöntemi seçimi |
| purchase           | transaction\_id, value, tax, shipping | Ödeme başarılı       |

### Ek: İçerik Şablonları

* **Ürün Başlık:** *Marka* + *Ürün Adı* + *Özellik* + *Boy/Gramaj*
* **Meta Title:** *Ürün Adı* — *Marka* | Favori Kozmetik
* **Meta Desc:** *Kısa fayda + marka + gramaj + kargo/iadeye dair güven cümlesi*



# FAVORIKOZ — Supabase Migration & Implementation Rules (Cursor)

> Scope: Migrate file‑based shop to Supabase (DB, Auth, Storage), wire into Next.js App Router, secure with RLS, and prepare webhooks for iyzico.

---

## 0) Project Constraints & Targets

* **Stack:** Next.js 14 (App Router, TS), Tailwind, Supabase (Postgres + Auth + Storage + Edge Functions), iyzico (3DS), Cloudinary → **migrate to Supabase Storage**.
* **Scale:** 10k–50k products; fast catalog queries; SEO-friendly slugs; soft deletes.
* **CWV Targets:** LCP ≤2.5s, CLS ≤0.1, INP ≤200ms.
* **Security:** RLS on **all** tables; JWT-based auth; admin role via user metadata; signed URLs for private assets.

---

## 1) Environment & Secrets

Create `.env.local` and Vercel envs:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."          # for Edge Functions / server actions only

# Cookies / Session
NEXTAUTH_SECRET="generate-strong-secret" # if using next-auth (optional)
JWT_SECRET="generate-strong-secret"

# Payments (iyzico)
IYZICO_API_KEY="..."
IYZICO_SECRET_KEY="..."
IYZICO_BASE_URL="https://sandbox-api.iyzipay.com" # prod: https://api.iyzipay.com
IYZICO_WEBHOOK_SECRET="..."               # validate webhook source

# Optional
GA4_ID="G-XXXXXXX"
```

**CSP** (example, refine as needed):

```http
Content-Security-Policy: default-src 'self'; img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; connect-src 'self' https://*.supabase.co https://api.iyzipay.com https://sandbox-api.iyzipay.com; style-src 'self' 'unsafe-inline'; frame-src https://*.iyzipay.com;
```

---

## 2) Database Schema (SQL)

> Use `uuid`, `timestamptz`, `jsonb`. Add `deleted_at` for soft delete. All tables **RLS enabled** by default.

```sql
-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm; -- for search

-- 2.1 categories
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_categories_slug on public.categories (slug);

-- 2.2 products
create table if not exists public.products (
  id uuid primary key,                   -- preserve existing IDs for SEO
  slug text unique not null,
  name text not null,
  brand text,
  price bigint not null,                 -- in kuruş
  original_price bigint,
  discount int check (discount between 0 and 100),
  image text,
  images text[] default '{}',
  rating numeric(2,1) default 0 check (rating between 0 and 5),
  reviews_count int default 0,
  is_new boolean default false,
  is_best_seller boolean default false,
  in_stock boolean default true,
  category_slug text references public.categories(slug) on delete set null,
  description text,
  barcode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_products_category on public.products (category_slug);
create index if not exists idx_products_flags on public.products (is_new, is_best_seller, in_stock);
create index if not exists idx_products_trgm on public.products using gin (name gin_trgm_ops);

-- 2.3 users (profiles)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  phone text,
  role text check (role in ('customer','admin','editor')) default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.4 orders
create type order_status as enum ('pending','paid','shipped','completed','cancelled');
create type payment_status as enum ('pending','completed','failed');
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  user_id uuid references public.profiles(id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  shipping_address jsonb not null,
  billing_address jsonb,
  items jsonb not null,                  -- immutable snapshot
  subtotal bigint not null,
  shipping_cost bigint not null,
  total bigint not null,
  status order_status not null default 'pending',
  payment_method text not null,
  payment_status payment_status not null default 'pending',
  payment_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_user on public.orders (user_id);

-- 2.5 favorites
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- 2.6 reviews
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  verified boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_product on public.reviews (product_id);

-- 2.7 banners
create table if not exists public.banners (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subtitle text,
  image text not null,
  link text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.8 featured_products
create table if not exists public.featured_products (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id)
);
```

### 2.9 Storage (Buckets)

```sql
-- public product images
select storage.create_bucket('product-images', jsonb_build_object('public', true));
-- banners/hero
select storage.create_bucket('banners', jsonb_build_object('public', true));
-- private (e.g., invoices)
select storage.create_bucket('private', jsonb_build_object('public', false));
```

---

## 3) RLS Policies (SQL)

> Principle: **Public read** for catalog (products/categories/banners when active & not deleted). **Owner read/write** for user-owned tables. **Admin** (profiles.role='admin') full CRUD.

```sql
-- Enable RLS
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.banners enable row level security;
alter table public.featured_products enable row level security;

-- Helper: is_admin()
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  );
$$;

-- CATEGORIES: public read where not deleted
create policy "categories_public_read" on public.categories for select
  using (deleted_at is null);
-- admin write
create policy "categories_admin_all" on public.categories for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- PRODUCTS: public read where not deleted
create policy "products_public_read" on public.products for select
  using (deleted_at is null);
-- admin write
create policy "products_admin_all" on public.products for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- PROFILES: user can read/update self; admin read all
create policy "profiles_self_read" on public.profiles for select
  using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_self_update" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ORDERS: owner read; owner insert; admin all
create policy "orders_owner_read" on public.orders for select
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "orders_owner_insert" on public.orders for insert
  with check (user_id = auth.uid());
create policy "orders_admin_all" on public.orders for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- FAVORITES: owner only; public cannot read others
create policy "favorites_owner_all" on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- REVIEWS: public read; authenticated insert; owner update; admin all
create policy "reviews_public_read" on public.reviews for select using (true);
create policy "reviews_auth_insert" on public.reviews for insert
  with check (auth.uid() is not null);
create policy "reviews_owner_update" on public.reviews for update
  using (user_id = auth.uid());
create policy "reviews_admin_all" on public.reviews for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- BANNERS & FEATURED: public read when active; admin all
create policy "banners_public_read" on public.banners for select using (is_active);
create policy "banners_admin_all" on public.banners for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "featured_public_read" on public.featured_products for select using (is_active);
create policy "featured_admin_all" on public.featured_products for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
```

### 3.1 Storage Policies

```sql
-- Allow public read for product-images and banners
create policy "public_read_product_images" on storage.objects for select
  using (bucket_id in ('product-images','banners'));

-- Admin can write to public buckets
create policy "admin_write_public_buckets" on storage.objects for insert to authenticated
  with check (
    (bucket_id in ('product-images','banners')) and public.is_admin(auth.uid())
  );
create policy "admin_update_public_buckets" on storage.objects for update to authenticated
  using (
    (bucket_id in ('product-images','banners')) and public.is_admin(auth.uid())
  );

-- Private bucket: only owner/admin
create policy "private_owner_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'private' and (owner = auth.uid() or public.is_admin(auth.uid()))
  );
create policy "private_owner_write" on storage.objects for all to authenticated
  using (
    bucket_id = 'private' and (owner = auth.uid() or public.is_admin(auth.uid()))
  ) with check (
    bucket_id = 'private' and (owner = auth.uid() or public.is_admin(auth.uid()))
  );
```

---

## 4) Seeds & Data Migration

### 4.1 Seed Categories

```sql
insert into public.categories (slug, name) values
('protez-tirnak','Protez Tırnak'),
('kalici-makyaj','Kalıcı Makyaj & Microblading'),
('ipek-kirpik','İpek Kirpik'),
('kisisel-bakim','Kişisel Bakım'),
('makyaj','Makyaj'),
('sac-bakimi','Saç Bakımı'),
('erkek-bakim','Erkek Bakım'),
('kuafor-guzellik','Kuaför & Güzellik Merkezleri')
on conflict do nothing;
```

### 4.2 Node Migration Script (`scripts/migrate-products.ts`)

```ts
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import slugify from 'slugify';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const raw = await fs.readFile('data/products.json', 'utf8');
  const items = JSON.parse(raw);

  for (const p of items) {
    const id = p.id; // preserve
    const slug = p.slug || slugify(p.name, { lower: true, strict: true });
    const { error } = await supabase.from('products').upsert({
      id, slug,
      name: p.name,
      brand: p.brand,
      price: Math.round(Number(p.price) * 100),
      original_price: p.originalPrice ? Math.round(Number(p.originalPrice) * 100) : null,
      discount: p.discount ?? null,
      image: p.image,
      images: p.images ?? [],
      rating: p.rating ?? 0,
      reviews_count: p.reviews ?? 0,
      is_new: !!p.isNew,
      is_best_seller: !!p.isBestSeller,
      in_stock: p.inStock ?? true,
      category_slug: p.category ?? null,
      description: p.description ?? null,
      barcode: p.barcode ?? null,
    }, { onConflict: 'id' });
    if (error) console.error(p.name, error.message);
  }
}
run();
```

> **Note:** If Cloudinary → Supabase Storage migration is needed, fetch and re-upload product images, then replace URLs.

---

## 5) Next.js Wiring (Server & Client)

### 5.1 Supabase Helpers

`src/lib/supabase/server.ts`

```ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) => cookieStore.set({ name, value: '', ...options }),
      },
    }
  );
}
```

`src/lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 5.2 Admin Middleware

`src/middleware.ts`

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const role = req.cookies.get('sb-access-token') ? 'unknown' : 'guest';
    // Optionally call an API route to verify role=admin via server client
    // For brevity, let the server route enforce final check.
  }
  return NextResponse.next();
}
export const config = { matcher: ['/admin/:path*'] };
```

### 5.3 API Route Example (Products)

`src/app/api/products/route.ts`

```ts
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .is('deleted_at', null)
    .limit(60);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
```

### 5.4 Full‑Text Search Endpoint

```ts
// /api/search?query=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('query')?.trim() || '';
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('products')
    .select('id,slug,name,brand,price,image')
    .ilike('name', `%${q}%`)
    .limit(20);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}
```

### 5.5 Client Cart/Favorites Persistence (V2)

* On login, **migrate localStorage** items to server: upsert `favorites` and create draft `orders`/`carts` if needed.
* Keep localStorage for guests; sync on auth.

---

## 6) Payments & Webhooks

### 6.1 Checkout Flow (Server)

* Create iyzico payment initialization on server route.
* Redirect to 3DS; store `payment_token` in `orders`.

### 6.2 Edge Function: `payment-webhook`

* Verify signature using `IYZICO_WEBHOOK_SECRET`.
* On `payment.success` → set `payment_status='completed'`, `status='paid'`.
* On `payment.failed` → set `payment_status='failed'`.
* Reduce stock (optional) and emit Supabase Realtime event for admin UI.

Skeleton:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // TODO: verify webhook; parse event
  // const event = await req.json();
  // update orders by order_number
  return new Response('ok');
});
```

---

## 7) Admin Panel Notes

* Use server components for reads + client components for mutations with `supabase` client (RLS enforced).
* Protect actions: check `profiles.role==='admin'` server-side.
* Image uploads go to `product-images`/`banners` via signed upload or admin-only policy.

---

## 8) Indexes & Performance

* Indexes already added for: `slug`, `category_slug`, `flags`, trigram on `name`.
* For **best sellers**: maintain materialized view or nightly job computing top `orders.items`.
* Use **edge caching** on `/api/products`, `/api/categories`, `/api/banners`.

Materialized view (optional):

```sql
create materialized view if not exists public.best_sellers as
select p.id, p.slug, p.name, coalesce(sum((item->>'qty')::int),0) as sold
from orders o
cross join lateral jsonb_array_elements(o.items) item
join products p on p.id::text = item->>'id'
where o.status in ('paid','shipped','completed')
  and p.deleted_at is null
group by 1,2,3;
create index if not exists idx_best_sellers_sold on public.best_sellers (sold desc);
```

---

## 9) Auth & Profile Lifecycle

* Use Supabase OAuth/email magic link for customers.
* On `auth.user.created` trigger: insert row into `public.profiles`.

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name',''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 10) Testing Checklist

* [ ] RLS: anonymous can read products/categories/banners only.
* [ ] Auth user: can create own favorites; cannot see others.
* [ ] Admin: full CRUD on products/categories/banners/featured.
* [ ] Webhook: updates order status → dashboard realtime event.
* [ ] Data migration: 10k+ products load under 5m locally.
* [ ] Images: signed URL generation works; public buckets read-only.

---

## 11) Cursor Tasks (What to do next)

1. **Create SQL migration** file with Sections 2 & 3 and run on Supabase SQL Editor.
2. Add **helpers** from 5.1; refactor `/api` routes to use Supabase.
3. Implement **admin guard** and server actions for products CRUD.
4. Replace Cloudinary uploader with **Supabase Storage** (admin-only write, public read).
5. Add **Edge Function** `payment-webhook` and deploy secret keys.
6. Run **migration script** `scripts/migrate-products.ts` to import `data/products.json`.
7. Wire checkout flow to create `orders` then redirect to iyzico.
8. Enable **GA4** events (view_item, add_to_cart, begin_checkout, purchase).

---

## 12) Coding Standards

* Use **Zod** schemas for API payloads.
* Always check `error` from Supabase; map to human-friendly message.
* Keep **price** in smallest unit (kuruş) in DB; format on UI.
* Use `next/image` & `AVIF/WebP` with responsive sizes.

---

## 13) Appendix: TypeScript Types

```ts
export type Product = {
  id: string; slug: string; name: string; brand?: string;
  price: number; original_price?: number | null; discount?: number | null;
  image?: string | null; images: string[]; rating: number; reviews_count: number;
  is_new: boolean; is_best_seller: boolean; in_stock: boolean; category_slug?: string | null;
  description?: string | null; barcode?: string | null; created_at: string; updated_at: string; deleted_at?: string | null;
};
```

---

**Done.** Paste this file into `.cursorrules` or keep as a reference doc. Next step: generate SQL migration in Supabase SQL Editor, then implement the API routes and admin UI actions following these rules.



# FAVORIKOZ - SUPABASE MIGRATION RULES

## Database Schema
- Use PostgreSQL native types (uuid, timestamptz, jsonb)
- Enable Row Level Security (RLS) on all tables
- Create indexes: slug (unique), category, isNew, isBestSeller
- Use soft deletes (deleted_at column) for products

## API Pattern
- Replace file-based CRUD with Supabase client
- Use server-side Supabase client in API routes
- Use client-side Supabase client in components (with RLS)
- Implement proper error handling + logging

## Authentication
- Migrate admin auth to Supabase Auth
- Use role-based access (metadata: { role: 'admin' | 'customer' })
- Protect admin routes with middleware
- Implement JWT validation

## Storage
- Move all images to Supabase Storage
- Set up public/private buckets
- Create signed URLs for private content
- Implement upload size limits (5MB max)

## Data Migration
- Write migration script: products.json → Supabase
- Preserve all product IDs (important for SEO)
- Seed categories table
- Create admin user

## Performance
- Use Supabase Edge Functions for heavy operations
- Implement database query caching
- Use Supabase Realtime for admin panel updates
- Optimize images via Supabase Transform

## Testing
- Test all CRUD operations
- Verify RLS policies
- Load test with 10,000+ products
- Test payment callback persistence