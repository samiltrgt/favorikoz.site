# Reklam ölçüm v4 — oturum özeti (05–06.10.2026)

Bu dosya, kurulum sırasında yapılan işlerin özetidir. Alttaki bölümde orijinal kurulum rehberi (`reklam-olcum-v4-kurulum.md`) aynen yer alır.

---

## Bu sohbette ne yapıldı

### A. Durum tespiti
- `docs/reklam-olcum-v4-kurulum.md` incelendi.
- SQL migration’ların canlı Supabase’de daha önce uygulandığı doğrulandı.
- Eksikler: Vercel deploy, Google env, dakikalık cron, panel kurulumları (Meta Custom Conversion, feed’ler), GitHub commit.

### B. Doğrulama ve testler
- `npm run tracking:verify -- --remote` → Meta + şema OK; Google başlangıçta eksikti.
- `npm run test:tracking:sql` geçti.
- `npm run type-check` geçti.
- `npm test -- --runInBand` geçti (154 test).
- `npm run build` geçti.

### C. Vercel ortam değişkenleri
Production / Preview’a eklendi:
- `CRON_SECRET`
- `NEXT_PUBLIC_TRACKING_MODE=direct`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_META_PIXEL_ID`
- `META_ENABLE_TEST_EVENTS=false`
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-30F1W6FBTD`
- `GA4_MEASUREMENT_ID=G-30F1W6FBTD`
- `GA4_API_SECRET` (gizli)
- `NEXT_PUBLIC_GOOGLE_ADS_ID=AW-18496418510`
- `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=Do3XCKT-uJIdEM7l4_NE`

Not: Production’da Meta test event kapalı. Yerel test için `META_TEST_EVENT_CODE` kullanılabilir.

### D. Dağıtım
- `npx vercel deploy --prod` ile production’a alındı (`https://favorikozmetik.com`).
- GA4 ve Ads label sonrası yeniden deploy edildi.
- Cron smoke test: `https://favorikozmetik.com/api/cron/tracking` secret ile 200 (`claimed:0`); yetkisiz 401.
- Not: `www` → apex 308 yönlendirmesi Authorization header’ı düşürebilir; cron URL’si **apex** olmalı: `https://favorikozmetik.com/api/cron/tracking`.

### E. Supabase dakikalık cron
Kullanıcı SQL Editor’da yaptı:
1. Vault secret’ları: `tracking_cron_url`, `tracking_cron_secret`
2. `supabase-tracking-cron.sql` uygulandı  
Yardımcı script hazır: `npm run tracking:setup-cron` (için `SUPABASE_ACCESS_TOKEN` gerekir).

### F. Google panelleri
- GA4 stream: Measurement ID `G-30F1W6FBTD` + Measurement Protocol API secret kuruldu.
- Google Ads hesabı oluşturuldu.
- Manuel Purchase dönüşümü: kimlik `18496418510`, etiket `Do3XCKT-uJIdEM7l4_NE`.
- Siteye manuel gtag yapıştırılmadı; uygulama `direct` modda yüklüyor.
- Kampanya varsa duraklatılması önerildi (harcama olmasın).

### G. Meta panelleri
- Custom Conversion oluşturuldu: Purchase, `value > 1000`, isim örn. `High Value Purchase`.
- Test Events ile CAPI Purchase doğrulandı (`TEST21667`).
- Test olayları Custom Conversion event listesini doldurmaz; standart Purchase seçilerek kuruldu.

### H. Ürün feed’leri
Canlı feed’ler (~1181 ürün):
- Meta: `https://favorikozmetik.com/api/feeds/meta`
- Google: `https://favorikozmetik.com/api/feeds/google`

Bağlantılar:
- Meta Commerce Manager → Data File → Scheduled fetch → Meta feed URL → ~1.2K ürün yüklendi, hata 0.
- Google Merchant Center → Scheduled feed → Google feed URL → 1.181 ürün eklendi, özellikler tanındı.

### I. Henüz yapılmayan / isteğe bağlı
| Madde | Durum |
|---|---|
| Git commit + push | Bekliyor (kod Vercel CLI ile canlıda; GitHub senkron değil) |
| Staging’de `tracking-measurement-regression.sql` | Yerel PGlite regresyonu geçti; staging ayrı çalıştırılmadı |
| GA4 Enhanced Measurement history page-view kapatma | Panelde kontrol edilmeli |
| Google Ads Value Rules / iptal-iade OAuth | İsteğe bağlı |
| Iyzico sandbox tam kabul checklist’i | Operasyonel, sonra sınanabilir |
| Meta EMQ / GA4 DebugView canlı sipariş doğrulaması | İlk gerçek satışta |

---

## Hızlı referans — canlı kimlikler

| Ne | Değer |
|---|---|
| Tracking mode | `direct` |
| GA4 | `G-30F1W6FBTD` |
| Google Ads | `AW-18496418510` / label `Do3XCKT-uJIdEM7l4_NE` |
| Meta feed | `/api/feeds/meta` |
| Google feed | `/api/feeds/google` |
| Cron | `/api/cron/tracking` + Vault + Vercel günlük fallback |

---

## Orijinal kurulum rehberi

Aşağıdaki metin, sohbet başında kullanılan `docs/reklam-olcum-v4-kurulum.md` içeriğidir.

---

# Reklam ölçüm v4 — kurulum ve doğrulama

Bu uygulama Next.js 14, Supabase Postgres ve Iyzico 3DS akışını kullanır. Kodun hazır olması ile canlı kurulumun tamamlanması farklı adımlardır. **Önce SQL dosyalarını uygulayın, sonra bu sürümü Vercel'e dağıtın.** Aksi halde sipariş kayıtları ve atomik ödeme onayı yeni kolon/fonksiyonları bulamaz; ödeme akışı hata verir.

## 1. Veritabanı

05.10.2026 canlı kurulum: aşağıdaki üç migration mevcut Supabase projesinde SQL Editor üzerinden başarıyla uygulandı. `orders`, `tracking_outbox`, `tracking_consent`, `ad_spend` ve `products` şema kontrolleri HTTP 200 döndü. Salt okunur SQL ile outbox/consent/harcama tablolarının müşteri rollerine kapalı olduğu, doğrudan sipariş UPDATE'in engellendiği ve ödeme RPC'sinin yalnız servis rolüne açık olduğu doğrulandı. Mevcut müşteri/sipariş kayıtlarında test ödemesi veya elle durum değişikliği yapılmadı. Bu çalışma sırasında Vercel'e yeni dağıtım yapılmadı; yerel üretim derlemesi başarılıdır.

Supabase SQL Editor'da şu sırayla çalıştırın:

1. `orders-analytics-tracking-migration.sql` — mevcut reklam kimliği kolonları.
2. `tracking-measurement-v4.sql` — `orders.tracking`, outbox, `tracking_consent`, ödeme onayı, lease/claim/finish fonksiyonları, izin geri çekme ve iptal/iade bastırma.
3. `supabase-ad-spend.sql` — günlük harcama ve platform geliri.

Mevcut sipariş/kupon migration'ları da kurulu olmalıdır. `supabase-orders-tracking.sql` kargo takip alanları içindir; reklam outbox'ını oluşturmaz. Ana migration'ı mevcut mağazada yeniden çalıştırmayın.

Alternatif yönetim erişimi: `.env.local` içine Supabase hesabınızın `SUPABASE_ACCESS_TOKEN` değerini ekleyip `node scripts/apply-tracking-migrations.mjs --apply` çalıştırın. Bu değer service-role JWT ile aynı değildir. Script erişim anahtarlarını veya müşteri verilerini yazdırmaz. Postgres bağlantısı/SQL Editor de kullanılabilir. Migration eski siparişlere otomatik Purchase göndermez; eski `meta_purchase_sent_at` alanı gönderimden önce kilit olarak kullanıldığı için gerçek teslimat kanıtı değildir.

`npm run test:tracking:sql`, PGlite ile izole bellek içi PostgreSQL motorunda migration'ları ve ikinci kez çalıştırılabilirliklerini sınar, ardından SQL regresyonunu çalıştırır. Gerçek Supabase'de kurulum sonrası **staging projesinde** `scripts/tracking-measurement-regression.sql` de çalıştırılmalıdır. Bu regresyon transaction sonunda geri alınır; ödeme-sipariş eşleştirme, tekilleştirme, eşzamanlı lease, platform checkpoint, onay geri çekme ve iptal bastırmayı sınar. Yerel motor testi Supabase rol/extension/project ayarlarını doğrulamaz. Üretim siparişlerinde ödeme durumunu elle değiştirerek test yapmayın.

`tracking_outbox` ve `ad_spend` anon/authenticated rollerine açık değildir. Müşteriler doğrudan orders tablosunu yazamaz; ödeme ve yönetici güncellemeleri doğrulanmış servis katmanından geçer. Supabase tarayıcı istemcisi anon anahtarı kullanmaya devam eder; service-role hiçbir `NEXT_PUBLIC_*` değerine konulmaz.

## 2. Ortam değişkenleri ve tek etiket sahibi

`.env.example` değişken adlarını ve boş değerleri listeler. Yerel `.env.local` ve Vercel Production/Preview değişkenleri ayrıdır. Yerelde bir değerin bulunması Vercel'e taşındığı anlamına gelmez. `npm run tracking:verify -- --remote --require-google` ortam varlığı ve canlı tablo kolonlarını kontrol eder; değerleri yazdırmaz. Google fazının anahtarları eksikse tam kurulum doğrulaması başarısız döner.

İki tarayıcı yolu vardır; birini seçin. Varsayılan `direct` modudur: canlı kontrolde mevcut GTM konteynerinin etiket listesi boş bulunmuştur.

- `NEXT_PUBLIC_TRACKING_MODE=direct`: uygulama Meta Pixel, GA4 ve Google Ads etiketlerini yükler; GTM hiç yüklenmez. Meta için `NEXT_PUBLIC_META_PIXEL_ID` veya sunucudaki açık kimlik `META_PIXEL_ID` kullanılır. `META_CAPI_ACCESS_TOKEN` tarayıcıya aktarılmaz.
- `NEXT_PUBLIC_TRACKING_MODE=gtm`: mevcut konteyner açıkça seçilir (`NEXT_PUBLIC_GTM_ID`, varsayılan `GTM-57BVM8H7`). Direct etiketler yüklenmez. Konteynerde aşağıdaki eşlemeleri gerçekten yayımlamanız gerekir.

Google tarayıcı: `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-...`, `NEXT_PUBLIC_GOOGLE_ADS_ID=AW-...`, `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`. Google sunucu: `GA4_MEASUREMENT_ID` (public kimlik fallback'i var) ve **gizli** `GA4_API_SECRET`. GA4 kimlikleri kullanıcı izin verdikten sonra mevcut `_ga`/oturum çerezlerinden alınır; email veya sipariş numarasından sahte client_id üretilmez.

Meta sunucu: `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, gerekirse `META_GRAPH_API_VERSION`. Test Events için `META_TEST_EVENT_CODE` yalnız staging/yerel testte kullanılmalı. Production'da varsayılan olarak dikkate alınmaz; Preview production derlemesinde test gerekiyorsa `META_ENABLE_TEST_EVENTS=true` sadece o ortamda tanımlayın. Production canlı olaylarında false tutun.

Eksik Google sunucu anahtarı/kimliği tamamlanmadan Google teslimatını başarılı saymayın. HTTP 2xx GA4'e yalnız alındı bilgisidir; staging'de resmi `/debug/mp/collect` doğrulamasını ve DebugView'i kontrol edin.

## 3. GTM modundaki eşlemeler

GTM Preview ile doğru tetiklenme ve izinleri kontrol edin; konteyner yayımlanmadan sitede dataLayer bulunması reklam etiketi kurulduğunu kanıtlamaz.

- Consent Initialization için Google'ın CMP/template `setDefaultConsentState` / `updateConsentState` API'lerini kullanın; varsayılan dört izin denied. `consent_update` olayında tercihi güncelleyin. Inline varsayılan gtag kuyruğu konteyner yüklenmeden önce hazırdır; GTM template yapılandırmasının yerine geçmez.
- Meta custom event tetikleyicileri: `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase`. Pixel `eventID` değeri dataLayer `eventID`; `contents`, `content_ids`, `value`, `currency`, `high_value` doğru eşlenir. Container'ın All Pages otomatik PageView etiketi uygulamadaki PageView ile iki kez çalışmamalı.
- GA4 custom event tetikleyicileri: `page_view`, `view_item`, `view_item_list`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`. E-ticaret `ecommerce` nesnesinden okunur. `purchase.transaction_id=order_number`.
- Google Ads Purchase: dönüşüm kimliği/etiketi ve transaction_id, value, TRY; user-provided data `user_data` değişkeninden dönüşümden önce hazır olur. İzin kontrolünde ad_storage, ad_user_data, ad_personalization kullanılır. Email/telefon GA4 olay parametrelerine eşlenmez.
- Aynı Google dönüşümünü GA4 import ve Ads website tag üzerinden iki ayrı primary conversion olarak toplamayı önleyin; kampanyaya tek primary Purchase seçin. Enhanced conversions panelde etkinleştirilmelidir.
- Uygulama SPA geçişlerinde manuel `page_view` gönderir. GA4 stream Enhanced Measurement içindeki **Page changes based on browser history events** seçeneğini kapatın (direct ve GTM modlarında). `send_page_view=false` yalnız başlangıç config olayını engeller; history ölçümünü kapatmaz. Aksi halde route değişimleri iki PageView üretebilir ve otomatik URL query'leri gönderilebilir. [Resmî PageView rehberi](https://developers.google.com/analytics/devguides/collection/ga4/views).

## 4. Kuyruk ve zamanlama

İzin, rastgele `fk_tracking_owner` çerezi ve artan `fk_consent_version` ile sunucudaki `tracking_consent` kaydına bağlanır. Sunucu onayı gelene kadar yeni izinler bekletilir; geri çekilen kanal tarayıcıda hemen kapanır. Çevrimdışı geri çekme kalıcı bekleme işaretiyle saklanır; sayfa yeniden açıldığında veya bağlantı geldiğinde tekrar gönderilir. Eski/çatışan sürüm yeni izni ezemez. Sunucu geri çekmeyi aldığında ilgili bekleyen olayları ve siparişteki reklam kimliklerini temizler; worker platform gönderiminden hemen önce izin ve lease durumunu yeniden okur. Yeniden izin verme eski olayları canlandırmaz. Sunucuya henüz ulaşmamış çevrimdışı değişiklik veya başlamış ağ isteği geriye dönük durdurulamaz. Aynı tarayıcı owner'ı kapsamındaki kayıtlar eşlenir; owner bilgisi olmayan eski siparişler otomatik eşlenmez.

Ödeme Iyzico'dan doğrulandıktan sonra `confirm_tracking_payment` RPC'si durum değişikliği ile Purchase satırını tek Postgres işlemi içinde yazar. Callback tekrarları aynı `order_number` olayını kullanır ve sevk durumunu geri almaz. Tarayıcı Purchase sahte `/api/e` taleplerinden oluşturulamaz.

`GET /api/cron/tracking`, `Authorization: Bearer CRON_SECRET` ister. Rastgele secret hem Vercel'e hem Supabase Vault'a aynı değerde konur. Yerel secret Vercel'e otomatik gönderilmez. `vercel.json` günlük 02:00 UTC / 05:00 İstanbul fallback içerir; Hobby'nin günlük sınırına uygundur. Hobby'de kesin dakika garantisi yoktur; çalışma 02:00–02:59 UTC / 05:00–05:59 İstanbul aralığında olabilir. **Günlük fallback, hızlı retry için yeterli değildir.**

Dakikalık kurulumu yapmak için Supabase Vault'ta `tracking_cron_url` = üretimdeki `/api/cron/tracking` HTTPS adresi ve `tracking_cron_secret` = CRON_SECRET oluşturun. Ardından `supabase-tracking-cron.sql` çalıştırın. pg_cron + pg_net HTTP worker'ı her dakika çağırır. Ödeme callback'leri ilgili Purchase kuyruğunu bekleyerek hemen boşaltmaya çalışır. `/api/e` de kalıcı kayıt sonrası en fazla 10 olayı bekleyerek gönderir; gönderim başarısız olsa da kabul edilmiş kayıt kaybolmaz ve 202 döner. Retry için dakikalık veya eşdeğer sık worker gereklidir: günlük Vercel fallback bir çağrıda en fazla 10 satır işler, yoğun trafikte tek başına yeterli değildir.

Lease süresi 3 dakika; SKIP LOCKED eşzamanlı işlemleri ayırır. Meta/GA4 teslimatları ayrı checkpoint olarak tutulur. Artan retry gecikmesi 30 saniye–6 saat, en fazla 12 deneme/72 saat. Olayın tarihi retry sırasında değiştirilmez. Başarısız/suppressed kişisel payload 7 gün, tarayıcı terminal satırları 30 gün sonra temizlenir (worker claim çalışırken). İptal/iade bekleyen Purchase gönderimini bastırır. Sürekli başarısız kuyruğu kontrol edip hatayı düzeltin; gerçek teslimat doğrulaması olmadan `sent` alanı yazmayın.

## 5. Fazların kapsamı

- Faz 0: consent, kimlik, ödeme, mevcut kilit, feed ve canlı kolon kontrolü yapıldı. Eksikler: kalıcı queue yokluğu, izinsiz attribution çerezleri, kilidin erken yazılması, sahte ödeme yolu ve token/sipariş uyumsuzluğu düzeltildi.
- Faz 1a/1b/1c: browser funnel, doğrulanmış Supabase kullanıcı external_id, request IP/UA, Meta CAPI ve durable Purchase outbox.
- Faz 1d: ilk document için Edge kimliği; etkileşimler yeni kimlik; aynı olayın browser/server kopyası aynı ID. 30 gün boyunca tek event_id kullanılmaz. Purchase daima order_number.
- Faz 1e: `/api/e` ve `/api/tracking/capi` first-party alım yolu; rate/size/schema/same-origin kontrolleri. Browser engelleyicilerin tamamını aşma garantisi yoktur.
- Faz 2a: `/api/feeds/meta` ve `/api/feeds/google` RSS XML; mevcut `/api/feeds/products` TSV. Ürün ID'si Pixel ID ile aynıdır, tutarlar DB'den TL'ye dönüşür. Eksik resim/pozitif fiyatı olmayan ürün yayınlanmaz; geçerli barcode check digit varsa GTIN verilir. Merchant Center'ın diğer ürün/politika gereksinimleri hesapta doğrulanır; iç ürün ID'si GTIN diye gönderilmez.
- Faz 2b/2c: GA4 Measurement Protocol Purchase, Google Ads browser conversion + enhanced data, dört Consent Mode v2 sinyali, analitik/pazarlama tercihi ve geri çekme. Etiket/panel anahtarları ayrıca kurulmalıdır.
- Faz 3a: sipariş şemasındaki `total` ve teslim edilmiş `status=completed` kullanılır. Yeni müşteri için 2.5×; geçmiş müşteride geçmiş+mevcut+ortalama×0.8. `predicted_ltv` tahmindir ve Purchase value artırılmaz. Kazanç veya ROAS iyileşmesi garantisi değildir.
- Faz 3b: Purchase `high_value=value>1000`. Meta Events Manager'da Custom Conversion: Purchase, currency TRY ve value >1000 koşulu. Bu hesap kurulumu kodun yayımlanmasıyla otomatik oluşmaz.
- Faz 3c: mağazada kapıda ödeme yok; uygulanmaz.
- Faz 4: `/admin/reports` ve yönetici kontrollü `/api/admin/reports/ads`. Gün/kaynak/kampanya harcaması ile ödenmiş sipariş tahsilatı karşılaştırılır; iptal/iade çıkarılır, eksik harcamaya ROAS uydurulmaz. UTM son saklanan kaynaktır; platform attribution modeliyle aynı olduğu iddia edilmez. Rapor sipariş oluşturma tarihini İstanbul günüyle kullanır. Value Rules için reklam hesabında gerçek marj/LTV/segment verisine göre ayrıca kurallar tanımlanmalı; `predicted_ltv` göndermek tek başına value rule kurmaz.

Google Ads iptal/iade ayarı isteğe bağlıdır: `.env.example` içindeki Google Ads OAuth/developer token/customer/conversion action değerleri gerekir. RETRACTION isteği v24 varsayılanıyla, transaction ID üzerinden gönderilir; HTTP 200 kısmi hata sayılmaz. Meta'da doğrulanmamış negatif Purchase veya sahte iade olayı gönderilmez.

Kuponlar Iyzico'ya negatif kalem olarak gönderilmez; indirim kuruş cinsinden pozitif ürün kalemlerine dağıtılır. Ürünlerin tamamını ücretsiz yapan kupon ayrı ücretsiz sipariş akışı gerektirdiği için mevcut kart akışında ödeme başlamadan açık hata ile reddedilir.

## 6. Dağıtım öncesi kabul

1. SQL uygulaması ve staging Postgres regresyonu başarılı.
2. `npm run type-check`, `npm test -- --runInBand`, `npm run test:tracking:sql`, `npm run build` başarılı. Canlı Supabase veri değiştiren eski testler varsayılan kapalıdır; sadece izole test projesinde açık opt-in kullanın.
3. Vercel Production ortamı, API kimlikleri ve CRON_SECRET kurulu; callback HTTPS domaini doğru. Migration uygulanmadan yeni ödeme kodunu dağıtmayın.
4. Onay reddinde attribution cookie/Pixel/CAPI/GA4 purchase yok. Analitik-only ve pazarlama-only ayrı çalışır; geri çekme ve yeniden onay sınanır.
5. Iyzico sandbox'ta başarılı/başarısız 3DS, aynı callback tekrarları, yanlış order_number/token eşleşmesi. Para birimi TRY ve indirimli/kargolu ödenmiş tutar browser/server aynı.
6. Meta Test Events browser/server event ID aynı, tek Purchase; gerçek EMQ/dedup raporu Meta panelinde doğrulanır. GA4 DebugView ve Ads enhanced conversion diagnostics doğrulanır.
7. Feed URL'leri reklam kataloglarına bağlanır; cron yetkisiz istek 401, geçerli secret ile queue claim çalışır. Vercel günlük cron yalnız fallback; Supabase dakikalık job'un run history'si kontrol edilir.

Resmî kaynaklar: [GTM consent](https://developers.google.com/tag-platform/security/guides/consent), [GA4 transaction dedup](https://support.google.com/analytics/answer/12313109), [Google RSS](https://support.google.com/merchants/answer/14987622?hl=en), [Supabase cron](https://supabase.com/docs/guides/cron/quickstart), [Vercel cron sınırları](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Google Ads adjustments](https://developers.google.com/google-ads/api/docs/conversions/upload-adjustments).
