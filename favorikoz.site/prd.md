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
