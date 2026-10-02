---
name: Favori Kozmetik — Reklam Ölçüm Altyapısı (Meta Pixel + CAPI, GA4, Google Ads)
overview: Meta Pixel + Conversions API, GA4 e-ticaret ve Google Ads dönüşümlerini bu sitenin gerçek ödeme akışına (Supabase + iyzico 3DS) göre kurar. Amaç hazır e-ticaret altyapılarının eklenti kurulumundan daha doğru sinyal: satın almayı sunucudan göndermek, reklam kimliklerini siparişe yazmak, çift sayımı event_id ile engellemek.
todos:
  - id: audit
    content: "FAZ 0: Ölçüm denetimi — kod + paneller. Kod değişmez, sadece rapor."
    status: pending
  - id: price-gate
    content: "FAZ 0.1: Reklam değeri için tek kapı — src/lib/analytics/value.ts; tüm olay tutarları ekran TL'si"
    status: pending
  - id: ssr-pages
    content: "FAZ 0.2: /tum-urunler ve derin kategori sayfasını sunucuya taşı (reklam açılış sayfaları)"
    status: pending
  - id: consent
    content: "FAZ 1.0: KVKK onay bandı + Consent Mode v2 (varsayılan red) — etiketlerden ÖNCE"
    status: pending
  - id: datalayer
    content: "FAZ 1.1: Tek dataLayer katmanı + 6 standart olay (Purchase hariç) + eventID"
    status: pending
  - id: click-ids
    content: "FAZ 1.2: fbp/fbc/fbclid/gclid/UTM/IP/UA yakala ve siparişe yaz (Supabase migration)"
    status: pending
  - id: capi-purchase
    content: "FAZ 1.3: Purchase'ı sunucudan gönder (sendPurchaseOnce) — 3ds-callback + status, tek sefer"
    status: pending
  - id: dedup-test
    content: "FAZ 1.4: Test Events ile dedup doğrulaması — reklam açma kapısı"
    status: pending
  - id: cancel-refund
    content: "FAZ 2.1: İptal/iade düzeltmesi (Google RETRACT), sadece onaylı sipariş Purchase"
    status: pending
  - id: catalog
    content: "FAZ 2.2: Meta katalog + Merchant Center feed, content_ids = products.id"
    status: pending
  - id: ga4-ads
    content: "FAZ 2.3: GA4 e-ticaret + Google Ads dönüşümü + enhanced conversions"
    status: pending
  - id: first-party
    content: "FAZ 3: İnce ayar — birinci taraf alt alan, marj bazlı value, kendi ROAS tablosu"
    status: pending
isProject: false
---

# Favori Kozmetik — Reklam Ölçüm Altyapısı

> Bu plan `favori_kozmetik_tam_i̇yileştirme_398151b4.plan.md` ile **aynı şey değildir**. O plan güvenlik/performans/SEO içindi ve tamamlandı. Bu plan reklam ölçümüdür.

**Hedef:** Meta ve Google'a gönderilen sinyaller, hazır e-ticaret altyapılarının (Shopify/İkas eklentisi) gönderdiğinden daha doğru olsun. Avantajımız özel script: sipariş verisine doğrudan erişimimiz var, eklentilerin gönderemediği kaliteyi gönderebiliriz. Dezavantajımız: hiçbir şey kendiliğinden kurulmaz.

---

## 0. Bu repoda doğrulanmış mevcut durum

Uygulayan ajan bunları yeniden keşfetmesin, **doğrulandı**:

| Konu | Durum | Kanıt |
|---|---|---|
| GTM kabı | Var, `GTM-57BVM8H7` | [src/app/layout.tsx](src/app/layout.tsx) satır 19, 122 — `@next/third-parties/google` |
| Meta Pixel (`fbq`) | **Yok** | kod genelinde arama sonucu boş |
| Conversions API | **Yok** | `graph.facebook.com` geçmiyor |
| GA4 e-ticaret olayları | **Yok** | `dataLayer` push'u yok |
| Google Ads dönüşümü | **Yok** | `AW-` geçmiyor |
| Çerez onayı / Consent Mode | **Yok** | sadece statik [src/app/cerez-politikasi/page.tsx](src/app/cerez-politikasi/page.tsx) |
| Veritabanı | Supabase (MongoDB **değil**) | `src/lib/supabase/*` |
| Ödeme | iyzico 3DS, kapıda ödeme yok | [src/app/api/payment/route.ts](src/app/api/payment/route.ts) |

### Ödeme akışı (sinyalin hayati noktası)

1. `POST /api/payment` — sipariş `orders` tablosuna `status: pending`, `payment_status: pending` olarak yazılır ([src/app/api/payment/route.ts](src/app/api/payment/route.ts) satır ~271-309). `payment_token = conversationId`.
2. Checkout sayfası 3DS HTML'ini **`document.write` ile mevcut sayfanın üzerine yazar** ([src/app/checkout/page.tsx](src/app/checkout/page.tsx) satır ~273-277). **Bu noktada checkout sayfasının tüm JS bağlamı yok olur.** Tarayıcı tarafı hiçbir olay artık o sayfadan gönderilemez.
3. Banka → `POST /api/payment/3ds-callback` → başarılıysa sipariş `status: paid`, `payment_status: completed` ([src/app/api/payment/3ds-callback/route.ts](src/app/api/payment/3ds-callback/route.ts) satır ~148-156). **Paranın geçtiği gerçek an burasıdır.**
4. Kullanıcı `/payment/callback` sayfasına yönlenir; o sayfa `/api/payment/status`'u sorar, o rota da siparişi `completed` yapabilir ([src/app/api/payment/status/route.ts](src/app/api/payment/status/route.ts) satır ~172-187).

**Sonuç:** 3. ve 4. adım aynı siparişi iki kez "ödendi" yapabilir. Purchase olayı bu iki yerden de tetiklenirse **çift satış** raporlanır. Ayrıca kullanıcı 3DS sonrası tarayıcıyı kapatırsa 4. adım hiç çalışmaz; satış gerçekleşmiş olmasına rağmen tarayıcı tarafı hiçbir şey göndermez. **Bu yüzden Purchase'ın tek gerçek kaynağı sunucudur.**

### Fiyat birimleri (reklam değerindeki en büyük risk)

[src/lib/price.ts](src/lib/price.ts) merkezi modül, **yeniden yazılmayacak**. Birimler:

| Katman | Birim | Dönüşüm |
|---|---|---|
| `products.price` (DB) | ekran TL × 1000 | `dbToDisplay()` |
| API / UI | TL | — |
| Sepet (`src/lib/cart.ts`) | TL × 10 | `toDisplayPrice()` |
| `orders.total`, `orders.items[].price` | kuruş benzeri | `kurusToTl()` / `toDisplayPrice()` |

Yanlış birim gönderilirse ROAS 10 veya 1000 kat şişer, algoritma tamamen yanlış öğrenir.

### Bilinen ölçüm engelleri

- `/tum-urunler` ve `/kategori/[c]/[s]/[...rest]` hâlâ `'use client'` + `no-store` fetch. Liste gelmeden olay basılamaz.
- Ana sayfa, ürün detay, üst kategori ve alt kategori **sunucu tarafında** ve hazır. Bunlara dokunulmayacak.

---

## FAZ 0 — Denetim (kod değiştirme yok)

Kurulumdan önce rapor üret. Emin olunmayan her satıra **"doğrulanamadı"** yaz, tahmin etme.

### 0.A Kodda ara ve tabloya dök

Aranacaklar: `fbq`, `graph.facebook.com`, `gtag`, `dataLayer`, `GTM`, `AW-`, `G-`, consent, cookie banner.

Çıktı tablosu: `olay | var / yok / eksik | dosya:satır | not`

Kontrol edilecek olaylar: `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase`.
Purchase için ayrıca: `value`, `currency`, `content_ids`, `contents`, `order_id` var mı?

CAPI için: `event_id` dedup, SHA-256 hashleme, `fbp`/`fbc`, `client_ip_address`, `client_user_agent`, access token env'de mi, Purchase nerede tetikleniyor, sayfa yenilenince çift sayım riski var mı?

### 0.B Panel denetimi (ajan göremez, kullanıcı yapar)

Bu adımlar **insan** tarafından yapılır, sonucu ajana yapıştırılır:

1. Chrome'a **Meta Pixel Helper** kur, sitede gez. Hangi olaylar tetikleniyor?
2. **Events Manager** → Conversions API bağlı mı? **Event Match Quality** skoru kaç? **Diagnostics**'te uyarı var mı?
3. **GTM container'ı JSON export** et. Kabın içi kodda görünmez; export olmadan "GTM'de ne var" sorusu cevaplanamaz.
4. Google Ads → Dönüşümler → tanımlı dönüşüm var mı, enhanced conversions açık mı?

---

## FAZ 0.1 — Reklam değeri için tek kapı

**Yeni dosya:** `src/lib/analytics/value.ts`

`src/lib/price.ts` yeniden yazılmaz. Üzerine ince bir katman eklenir: reklam platformlarına giden **her** tutar buradan geçer.

```
adValueFromCart(cartItems)       → sepet toplamı, ekran TL
adValueFromOrder(order)          → buildIyzicoPaidPriceFromOrder() sonucu (number), ödenen TRY
adItemsFromCart(cartItems)       → [{ id, quantity, item_price }] — item_price birim fiyat, TL
adItemsFromOrder(order)          → aynı yapı, sipariş satırlarından
```

Kurallar:

- `value` **her zaman** ekran TL'si, `currency` **her zaman** `"TRY"`.
- Purchase `value`'su **ödenen tutardır**: kargo dahil, kupon indirimi düşülmüş. Kaynak [src/lib/iyzico-payment-amount.ts](src/lib/iyzico-payment-amount.ts) → `buildIyzicoPaidPriceFromOrder`. Bu fonksiyon string döner; sayıya çevirip gönder.
- `contents[].item_price` **birim** fiyattır, satır toplamı değil.
- `orders.total` ham değeri hiçbir olaya girmez.

**Kabul kriteri:** Bilinen tutarlı bir test siparişi (örn. 1.250,00 TL) için Test Events'te `value: 1250` görünür; `1250000` veya `12500` değil.

---

## FAZ 0.2 — Reklam açılış sayfalarını sunucuya taşı

Reklam trafiğinin düşeceği iki sayfa hâlâ istemcide yükleniyor. Hem yavaş açılıyor hem de liste gelene kadar `view_item_list` basılamıyor.

- [src/app/tum-urunler/page.tsx](src/app/tum-urunler/page.tsx): `'use client'` + `fetch('/api/products', { cache: 'no-store' })`.
- [src/app/kategori/[category]/[subcategory]/[...rest]/page.tsx](src/app/kategori/[category]/[subcategory]/[...rest]/page.tsx): aynı desen, ayrıca `/api/categories` fetch'i.

Hedef: [src/app/kategori/[category]/page.tsx](src/app/kategori/[category]/page.tsx) ile **aynı model** — sunucu bileşeni, [src/lib/category-products.ts](src/lib/category-products.ts) üzerinden sorgu, stok filtresi, `.order('created_at').order('id')`, `export const revalidate = 60`. Arama/sıralama/filtre gibi etkileşimli parçalar client island olarak kalır, ilk liste SSR'da gelir.

**Kabul kriteri:** JavaScript kapalıyken bu iki sayfada ürün listesi HTML'de görünür.

---

## FAZ 1 — Temel sinyal (en büyük etki buradan gelir)

### Mimari kararlar (tartışılmaz)

1. **Tek tarayıcı borusu: GTM.** Koda ikinci bir Meta Pixel snippet'i eklenmez. Kod sadece `dataLayer`'a yazar; Meta Pixel, GA4 ve Google Ads etiketleri GTM kabından çıkar.
2. **Tek sunucu borusu: Next.js route handler.** Server-side GTM kurulmaz (tek kişilik ekipte gereksiz karmaşıklık).
3. **Dedup: `event_id`.** Tarayıcıda `eventID` (camelCase, `fbq`'nun 4. argümanı), sunucuda `event_id` (snake_case). **Aynı string.** `event_name` de birebir aynı (`Purchase`, PascalCase). Meta aynı Pixel ID'ye 48 saat içinde gelen aynı çifti tek sayar.

### 1.0 KVKK onayı — etiketlerden ÖNCE

Pazarlama çerezleri onay alınmadan çalışmaz. Varsayılan **red**.

Consent Mode v2 sinyalleri: `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`. Hepsi varsayılan `denied`, onayla `granted`.

- Onay reddedilirse Meta Pixel ve Google Ads etiketi hiç tetiklenmez.
- Onay bir çereze yazılır, her sayfada tekrar sorulmaz.
- Banda [/cerez-politikasi](src/app/cerez-politikasi/page.tsx) linki konur.
- Bant ilk boyamayı (LCP) geciktirmez.

### 1.1 dataLayer olayları

Her olay `eventID` taşır. Purchase dışındaki olaylar için sayfada bir kez üretilen UUID; Purchase için `order_number`.

| Meta olayı | GA4 karşılığı | Nerede | Not |
|---|---|---|---|
| `PageView` | `page_view` | route değişimi | App Router'da tam sayfa yenileme yok; GTM history-change yetmezse route değişince manuel push |
| `ViewContent` | `view_item` | [src/app/urun/[slug]/page.tsx](src/app/urun/[slug]/page.tsx) (client island) | `content_ids: [product.id]`, `content_type: 'product'` |
| — | `view_item_list` | kategori + tüm ürünler | **liste geldikten sonra**, boş listeyle basma |
| `AddToCart` | `add_to_cart` | [src/components/product-purchase.tsx](src/components/product-purchase.tsx), [src/components/product-card.tsx](src/components/product-card.tsx), [src/app/(auth)/favorilerim/page.tsx](src/app/(auth)/favorilerim/page.tsx) | 3 ayrı `addToCart` çağrısı var; hepsi kapsanmalı. Sepet birimi (10x) → `adValueFromCart` ile TL'ye çevrilir |
| `InitiateCheckout` | `begin_checkout` | [src/app/checkout/page.tsx](src/app/checkout/page.tsx) mount, sepet doluyken **bir kez** | adım değişiminde tekrar basma |
| `AddPaymentInfo` | `add_payment_info` | `handlePayment` içinde, **`document.write` 3DS devrinden ÖNCE** | sonra bassan JS bağlamı yok olur, olay kaybolur |
| `Purchase` | `purchase` | **sunucu** (bkz. 1.3) | tarayıcı kopyası sadece dedup içindir |

Purchase parametreleri:
`value` (TL, number), `currency: "TRY"`, `content_ids: [products.id]`, `contents: [{ id, quantity, item_price }]`, `content_type: "product"`, `order_id: order_number`, `event_id: order_number`.

### 1.2 Reklam kimliklerini siparişe yaz

Eşleşme kalitesini en çok bu yükseltir; hazır eklentilerin çoğu bunu yapmaz.

**Yakalama:** Siteye ilk girişte `fbclid`, `gclid`, `gbraid`, `wbraid` ve `utm_*` parametrelerini birinci taraf çereze yaz (90 gün). Kullanıcı reklamı tıklayıp 3 gün sonra satın alırsa çerez yoksa satış eşleşmez.

**Checkout'tan gönder:** [src/app/checkout/page.tsx](src/app/checkout/page.tsx) `handlePayment` içindeki `POST /api/payment` gövdesine yeni bir `tracking` nesnesi eklenir: `fbp` (`_fbp` çerezi), `fbc` (`_fbc` çerezi), `fbclid`, `gclid`, `gbraid`, `wbraid`, `utm_*`.

`fbc` çerezi yoksa ama `fbclid` varsa Meta formatında üret: `fb.1.{unix_ms}.{fbclid}`.

**Sunucuda ekle:** [src/app/api/payment/route.ts](src/app/api/payment/route.ts) içinde IP'yi **istemciden alma**, `x-forwarded-for` başlığından oku. `user-agent` başlığını da al. Bunları sipariş satırına yaz.

**Supabase migration — `orders` tablosuna yeni kolonlar:**
`fbp`, `fbc`, `fbclid`, `gclid`, `gbraid`, `wbraid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `client_ip`, `client_user_agent`, `meta_purchase_sent_at` (timestamptz, null).

Bu kolonlar RLS ile korunur; müşteriye dönen API yanıtlarında yer almaz.

### 1.3 Purchase'ı sunucudan gönder

**Yeni dosya:** `src/lib/analytics/meta-capi.ts` → `sendPurchaseOnce(orderNumber: string)`

Çalışma kuralı:

1. Siparişi çek. `payment_status !== 'completed'` ise **çık**.
2. `meta_purchase_sent_at` doluysa **çık** (idempotent kilit).
3. `meta_purchase_sent_at`'i önce işaretle, sonra gönder (yarış koşulu).
4. CAPI'ye POST at.

**Çağrı noktaları — sadece bu ikisi:**
- [src/app/api/payment/3ds-callback/route.ts](src/app/api/payment/3ds-callback/route.ts), sipariş `completed` yapıldıktan sonra (satır ~156 civarı, `trySendOrderConfirmationEmail` ile aynı yer).
- [src/app/api/payment/status/route.ts](src/app/api/payment/status/route.ts), aynı şekilde (satır ~187 civarı).

İkisi de aynı fonksiyonu çağırır; kilit sayesinde yalnızca ilki gönderir. **Böylece kullanıcı 3DS sonrası tarayıcıyı kapatsa bile satış ölçülür.**

Gönderim hatası sipariş akışını **bozmamalı** — `try/catch` ile yut, logla. Ödeme onayı ölçümden önemlidir.

**CAPI gövdesi:**

```
event_name: "Purchase"
event_time: Unix saniye (10 hane — milisaniye DEĞİL)
event_id: order_number
action_source: "website"
event_source_url: "{site}/payment/callback"
user_data: {
  em:          SHA-256(trim + lowercase e-posta)
  ph:          SHA-256(sadece rakam, ülke kodu 90 ile, baştaki 0 yok)
  fn, ln:      SHA-256(trim + lowercase)
  ct:          SHA-256(şehir, lowercase, boşluksuz)
  zp:          SHA-256(posta kodu)
  country:     SHA-256("tr")
  external_id: SHA-256(üye ise user_id, misafirse normalize e-posta)
  client_ip_address:  düz metin (hashlenmez)
  client_user_agent:  düz metin (hashlenmez)
  fbp, fbc:           düz metin (hashlenmez)
}
custom_data: { value, currency: "TRY", content_ids, contents, content_type, order_id }
```

`external_id` iki kanalda **aynı düz metinden** hashlenmeli; yoksa Meta iki farklı kullanıcı görür.

**Env:** `META_PIXEL_ID` (public olabilir), `META_CAPI_ACCESS_TOKEN` (**yalnızca sunucu**, `NEXT_PUBLIC_` öneki asla), `META_TEST_EVENT_CODE` (sadece testte; üretimde **boş**).

**Tarayıcı kopyası:** [src/app/payment/callback/page.tsx](src/app/payment/callback/page.tsx) `status === 'success'` olduğunda aynı `event_id` (= `order_number`) ile Purchase iter. `sessionStorage`'a `purchase_sent_{orderNumber}` yazarak sayfa yenilemesinde tekrar basmaz. Bu kopya **ikincildir**; sunucu zaten gönderdi, Meta dedup eder.

### 1.4 Reklam açma kapısı (doğrulama)

Faz 1 bitmeden reklam harcaması başlamaz. Test Events'te gerçek bir test siparişi:

- [ ] Tarayıcı ve sunucu Purchase **"Deduplicated"** görünüyor (iki ayrı satış değil)
- [ ] `value` ödenen TL ile birebir aynı, `currency: TRY`
- [ ] `content_ids` değerleri `products.id` ile aynı
- [ ] Event Match Quality (biraz trafik sonrası) **6 veya üzeri**
- [ ] Diagnostics temiz
- [ ] Üretimde `META_TEST_EVENT_CODE` boş
- [ ] Onay reddedildiğinde hiçbir pazarlama etiketi tetiklenmiyor

Kataloglu kampanya açılacaksa Faz 2.2 de bu kapıya dahildir.

---

## FAZ 2 — Doğruluk

### 2.1 İptal ve iade

- Purchase **yalnızca** iyzico `SUCCESS` + `payment_status = completed` için gider. `pending` sipariş sayılmaz. (Kapıda ödeme olmadığı için bu risk düşük, ama admin iptali var.)
- Admin siparişi `cancelled` yaparsa ([src/app/admin/orders/page.tsx](src/app/admin/orders/page.tsx)): Google tarafında conversion adjustment `RETRACT`, `order_id` = `order_number`.
- Meta tarafında **negatif Purchase uydurma**. İade olayını kurulum anındaki güncel Events Manager dokümanına göre gönder; dokümanda net karşılık yoksa **"doğrulanamadı"** yazıp sahte olay basma.

### 2.2 Katalog ve feed eşleşmesi

Meta ürün kataloğu + Google Merchant Center feed:

- `id` = `products.id` — Pixel `content_ids` ile **birebir aynı**. Aynı değilse dinamik remarketing ve Advantage+ katalog reklamları zayıf çalışır.
- `price` = sitede görünen TRY (`dbToDisplay`)
- `availability` = `in_stock` + `stock_quantity > 0`
- `link` = `{site}/urun/{slug}`
- `image_link`, `brand`, `title`, `description`

Not: `barcode` alanı her üründe dolu değil, kimlik olarak kullanılmaz.

### 2.3 GA4 + Google Ads

Aynı `dataLayer` kaydından beslenir, ayrı kod yazılmaz.

- GA4: `view_item`, `view_item_list`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`. Purchase'ta `transaction_id = order_number`, `value`, `currency: TRY`, `shipping`. Vergi ayrı hesaplanmıyorsa `tax` alanını **boş bırak**, 0 yazma.
- Google Ads dönüşümü GTM'den, aynı `transaction_id` ile (çift sayım koruması).
- Enhanced conversions: teşekkür sayfasında GTM'e **ham** e-posta ve telefon verilir, hashlemeyi Google yapar. **İki kez hashleme.** Google Ads arayüzünde "Enhanced conversions for web" açılmalı ve şartlar kabul edilmeli.
- Google Ads API tabanlı enhanced conversions bu fazda **yok** (API erişimi ayrı ve yavaş süreç).

---

## FAZ 3 — İnce ayar (reklam çalışırken)

1. **Birinci taraf alt alan** (`e.favorikozmetik.com`) + Meta CAPI Gateway. Safari JS çerezlerini 7 güne kısıtlıyor; sunucu çerezi bu süreyi uzatır. Faz 1 bitmeden kurulmaz.
2. **Marj bazlı value.** Üründe maliyet kolonu yoksa **bu madde atlanır**. Varsa `value` ciro yerine marj olur → algoritma kârlı ürünlere yönelir. Ayrı kampanyada test edilir; çalışan kampanyanın değer tanımı ortada değiştirilmez.
3. **Kendi ROAS tablon.** Siparişteki UTM + gerçek ciro ile kendi raporun. Meta ve Google kendi katkılarını şişirir. Dönemsel reklam kapatma testi (artımlılık) en dürüst ölçüdür.
4. **Hız.** İkinci snippet yok; GTM zaten `@next/third-parties` ile yükleniyor. Onay bandı LCP'yi geciktirmemeli.

---

## YAPILMAYACAKLAR (uygulama promptunun başına aynen yapıştır)

Bunlar yapılacak iş değil, **yasaktır**. Her biri ölçümü veya uyumu bozar:

1. **`src/lib/price.ts` yeniden yazılmayacak.** Üzerine `src/lib/analytics/value.ts` katmanı eklenir, modül değiştirilmez.
2. **Layout'a `fbq` snippet'i eklenmeyecek.** Tarayıcı etiketleri yalnızca mevcut GTM kabından çıkar. İkinci piksel her sayfa görüntülemesini iki kez sayar.
3. **Purchase sepete ekle veya öde butonuna bağlanmayacak.** Yalnızca sunucu `payment_status = completed` dediğinde gider. Ödeme formu gönderimi `AddPaymentInfo`'dur, satış değildir.
4. **`orders.total` ham değeri `value` olarak gönderilmeyecek.** Değer `buildIyzicoPaidPriceFromOrder` üzerinden TL'ye çevrilir.
5. **TC kimlik numarası hiçbir yere gönderilmeyecek.** Meta'ya, Google'a, `dataLayer`'a yazılmaz. Sipariş kaydında kalır.
6. **`fbp`, `fbc`, `client_ip_address`, `client_user_agent` hashlenmeyecek.** Hashlenenler: `em`, `ph`, `fn`, `ln`, `ct`, `zp`, `country`, `external_id`.
7. **Üretimde `META_TEST_EVENT_CODE` bırakılmayacak.** Dolu kalırsa gerçek satışlar Test Events'e düşer, kampanya öğrenemez.
8. **Kart verisi (numara, CVC, son kullanma) hiçbir ölçüm olayına girmeyecek.**
9. **`META_CAPI_ACCESS_TOKEN` istemciye sızdırılmayacak.** `NEXT_PUBLIC_` öneki kullanılmaz.
10. **Ana sayfa, ürün detay ve üst/alt kategori sayfalarının mevcut SSR + ISR yapısı bozulmayacak.** Ölçüm kodu bu sayfaları client component'e çevirmemeli.
11. **Server-side GTM kurulmayacak** (bu ölçekte gereksiz karmaşıklık).
12. **Onay alınmadan hiçbir pazarlama etiketi tetiklenmeyecek.**

---

## Uygulama sırası

```
FAZ 0   (denetim — kod değişmez)
  ↓
FAZ 0.1 (value.ts)  +  FAZ 0.2 (SSR sayfalar)    ← Faz 1'den önce biter
  ↓
FAZ 1.0 (consent) → 1.1 (dataLayer) → 1.2 (kimlikler) → 1.3 (CAPI Purchase) → 1.4 (test)
  ↓
🚦 REKLAM AÇMA KAPISI
  ↓
FAZ 2   (iptal/iade, katalog, GA4+Ads)   ← kataloglu kampanya açılacaksa 2.2 kapıdan önce
  ↓
FAZ 3   (ince ayar, reklam çalışırken)
```

---

## Resmi kaynaklar

Kurulum sırasında bu dokümanlar **okunacak**, hafızadan yazılmayacak:

- [Conversions API — uçtan uca kurulum](https://developers.facebook.com/docs/marketing-api/conversions-api/guides/end-to-end-implementation)
- [Pixel + CAPI dedup](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events/)
- [Sunucu olay parametreleri](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event/)
- [Müşteri bilgisi parametreleri (hashleme kuralları)](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters/)
- [External ID](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/external-id/)
- [CAPI en iyi uygulamalar](https://developers.facebook.com/docs/marketing-api/conversions-api/best-practices)
- [Google Ads — enhanced conversions for web](https://support.google.com/google-ads/answer/13258081)
- [Google tag — dönüşüm ölçümü](https://developers.google.com/tag-platform/devguides/conversions)
- [GA4 e-ticaret olayları](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [Google Ads API — conversion adjustments (iade/iptal)](https://developers.google.com/google-ads/api/docs/conversions/enhanced-conversions/web)

---

## Ek: Reklam kurulumu bittikten sonra

Bu bölüm kod değil, operasyon. Ölçüm tavanı belirler; performansı kreatif belirler.

**İlk kampanya.** Tek Advantage+ satış kampanyası, katalog bağlı, Purchase optimizasyonu. Meta öğrenme aşaması için kampanya başına haftada ~50 dönüşüm ister. Kaba başlangıç: günlük bütçe ≈ 7 × hedef CPA. Bu bütçeye ulaşılamıyorsa `AddToCart` optimizasyonuyla başla, veri birikince Purchase'a geç.

**Kreatif asıl kaldıraçtır.** 3-5 farklı açı: ürün uygulama videosu, önce/sonra, yorum ve sosyal kanıt, teklif, UGC. Ağırlık dikey video. Aynı görselin rengini değiştirmek yeni kreatif değildir. Kozmetikte uygulama videosu ve yakın plan renk en çok çalışan formatlardır.

**İlk 3-4 gün dokunma.** Bütçeyi tek seferde ~%20'den fazla değiştirme, kreatifi sürekli değiştirme — öğrenme sıfırlanır. Bir reklamı hedef CPA'nın 2-3 katı harcamadan kapatma, veri yetersiz kalır.

**Haftalık ritim.** 2-3 yeni kreatif ekle, kaybedeni kapat, kazananın bütçesini kademeli artır.

**Teşhis sırası.**

| Belirti | Sorun |
|---|---|
| Gösterim var, tıklama yok | Kreatif |
| Tıklama var, sepete ekleme yok | Ürün sayfası veya fiyat |
| Sepete ekleme var, satın alma yok | Kasa, kargo ücreti, 3DS akışı |
| Hepsi iyi, ROAS düşük | Marj veya teklif |

Bu teşhis ancak Faz 1 kurulduysa mümkündür; olaylar yoksa hangi adımda kaybedildiği görülemez.

**Açılış sayfası.** Reklam ana sayfaya değil, ürün veya kategori sayfasına insin. Faz 0.2 tamamlanmadan `/tum-urunler`e reklam verme.

**Google ikinci kanal.** Shopping / Performance Max, Meta oturduktan sonra. Küçük bütçede ikisini aynı gün başlatma. Bütçe büyüdüğünde arama niyeti farklı olduğu için paralel çalışabilirler.

**Tekrar satın alma.** Oje, jel gibi tekrar alınan ürünlerde ilk kampanya oturduktan sonra ayrı bir elde tutma kampanyası açılır. Başlangıçta açılmaz.

**Gizli taktik yoktur.** Ajans farkı: kreatif üretim hızı, teklif testi, kazananı kesip yenisini bağlama disiplini, artımlılık testi (bir bölgede reklamı kapatıp farkı ölçmek). Yasak yöntemler (sahte etkileşim, teşvikli satın alma, cloaking) hesap yakar.

**Öğrenme kaynakları.** Meta Blueprint, Google Skillshop, Events Manager Diagnostics, Advantage+ yardım sayfaları. Kreatif araştırması için reklam kütüphaneleri. Bu alanda kitaplar hızla eskir; paneldeki uyarı güncel belgeden daha iyi öğretmendir.
