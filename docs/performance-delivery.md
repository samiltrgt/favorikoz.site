# Performans teslimi — 8 Ekim 2026

Uygulama ve yerel doğrulama tamamlandı. Deploy yapılmadı. Canlı site sonucu, bu değişiklikler yayımlandıktan sonra ayrıca ölçülmeli.

## Karşılaştırılabilir ölçüm

Git HEAD arşivi ayrı üretim build'iyle 3101 portunda, değişiklikler 3102 portunda ölçüldü. Lighthouse 13.5.0, Chrome 141, aynı mobil ekran ve simüle yavaş ağ/CPU ayarları kullanıldı; ayarların eşitliği rapor oluşturulurken kontrol edildi. Ana sayfa sonuçları her sürümde üç soğuk çalıştırmanın ortancasıdır. Katalog/ana sayfa verileri canlı kaynaktan geldiği için zamanla değişebilir. Ham kayıtlar yerelde tutulur; özet `performance-comparison.json` içindedir.

| Ana sayfa | Önce | Sonra |
| --- | ---: | ---: |
| Performans puanı | 59 | 80 |
| LCP | 16,15 sn | 4,92 sn |
| FCP | 2,12 sn | 2,11 sn |
| Speed Index | 5,12 sn | 2,77 sn |
| TBT | 284 ms | 56 ms |
| CLS | 0,0048 | 0,0041 |
| Toplam transfer | 2,80 MB | 0,79 MB |

LCP yaklaşık %70, transfer yaklaşık %72 azaldı. FCP belirgin değişmedi. Bunlar kullanıcının önceki raporuyla doğrudan kıyaslanmış rakamlar değil, aynı yerel koşullarda yeniden alınmış önce/sonra ölçümleridir. Ana sayfada iki sürümde de LCP öğesi ilk promo ürününün Full Tırnak Seti görseliydi.

Kategori `/kategori/tirnak` tek eşleştirilmiş örneğinde LCP 5,26 → 4,55 sn, puan 77 → 83, transfer 0,89 → 0,77 MB. Ürün `/urun/microbrush-100lu-4sxx1b3fk` örneğinde LCP 3,06 → 2,77 sn, puan 94 → 96, transfer 0,39 → 0,34 MB. Bu iki tek örnek bütün sayfaların puanını veya aynı kazancını garanti etmez. Örnek kategori/ürün TBT'si 45/28 → 74/64 ms aralığına çıktı; düşük kaldı, her metriğin iyileştiği iddia edilmiyor.

Üstteki simüle LCP ile ayrıntılardaki gözlemlenmiş LCP farklı ölçüm temelindedir. Canlı başlangıç çalıştırmasında aynı kayıtta simüle LCP 18,095 sn, gözlemlenmiş LCP alt parçaları toplamı 2,519 sn idi; raporlar birbiriyle çelişmiyor. [Lighthouse throttling belgesi](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md).

## Uygulanan değişiklikler

- 1.181 ürünün 2.428 farklı ana/galeri görseli ile dört banner ve dört logo için gerçek genişlikleri belirtilen WebP türevleri üretildi. Telefona ve geniş ekrana uygun boyutlar sunuluyor; bilinmeyen yeni görseller orijinal kaynakla çalışıyor.
- Görsel dosyaları içerik hash'li ve bir yıllık immutable önbellek başlığı kullanıyor. 7.266 dosyanın gerçek genişlikleri, çözülmesi ve hash'leri doğrulandı. Yeni türevlerin toplamı 201 MiB; bu depolama/deploy boyutudur, ziyaretçinin indirdiği miktar değildir.
- Katalog görsel manifesti yalnız sunucuda tutuldu. İlk incelemede yakalanan tarayıcı paketini büyütme sorunu giderildi. Son üretim build'inde ana sayfa First Load JS 124 KB, ürün 120 KB; ilk hatalı uygulamada 210/206 KB idi.
- Ürün kartlarının ilk gösterimini bekleten giriş animasyonu kaldırıldı. Sırası verilmemiş kartlar lazy/auto; açıkça ilk iki kart eager/high. Görünür ürün içerikleri hydration beklemiyor.
- Dokunmatik cihazlarda doğal kaydırma kullanılıyor. Masaüstü animasyon kitaplıkları yükleme sonrasına alındı. Banner otomatik geçişi korundu; yüklenmeden, görünür olmadan ve reduced-motion açıkken çalışmıyor. Manuel kontroller çalışıyor.
- Editorial satırların kolonları JavaScript olmadan doğru genişlikte. Pointer hareketinde tekrarlanan layout okumaları ve değişmeyen carousel state güncellemeleri azaltıldı.
- Görsel bakımında yarıda kalan veya hatalı run yayımlanabilir manifesti değiştirmiyor. Başarılı tamamlanma atomik yayımlıyor; devam kaydı tutuluyor.

## Kabul kontrolleri

- Üretim build'i, lint/tip aşamaları ve 102 route üretimi geçti. Temizlenmiş tsconfig ile son `npx tsc --noEmit` geçti.
- Root birleşik kontrolü: 12 suite, 70 test geçti. Manifestin kesinti/hata halinde korunması için Node regresyon testi de geçti.
- 48 SEO/alışveriş kontrolünün tamamı geçti: canonical, indeksleme kuralları, 404/308, ürün şeması, katalogla tam sitemap karşılaştırması ve sepet/teslimat/ödeme formu. Sipariş gönderilmedi; ödeme endpoint'i çağrılmadı.
- Mobil 390px / masaüstü 1440px, JavaScript açık/kapalı görüntüleme ve ekrandaki görsellerin yüklenmesi doğrulandı. Yatay taşma ve JavaScript hatası yok. Editorial/promo/banner kontrolleri çalıştı. DPR1 telefonda 320px ürün türevi, DPR2 ürün detayında 960px türevi seçildi; HTTP 200 ve immutable önbellek başlığı doğrulandı.
- Ayrı Fontenay yönetim çalışmasının değişiklikleri korundu. Deploy veya commit yapılmadı.

Kanıtlar: `performance-comparison.json`, `perf-browser-acceptance.json`, `perf-seo-acceptance.json`, `perf-images-verification.json`, `perf-image-verification.json`. Alt görev incelemeleri: `perf-images.md`, `perf-render.md`, `perf-inventory.md`.

## Kalan işler ve yayın

LCP henüz 2,5 sn hedefinin altında değil. İlk görünümü engelleyen yaklaşık 25–29 KiB CSS ve ilk çizim/render beklemesi sonraki ölçümlü iyileştirme alanlarıdır. Next 14 App Router için `optimizeCss` etkisi doğrulanamadığından körlemesine etkinleştirilmedi; stilleri geciktirerek görünümü bozacak değişiklik yapılmadı. Onest zaten `display: swap` kullanıyor; Türkçe karakter alt kümesi korundu. Yaklaşık 12 KiB eski tarayıcı polyfill fırsatı, uyumluluk hedefi belirlenmeden kaldırılmadı. Bunlar açık değerlendirilmiş kalan fırsatlardır.

Yayın için kod, `src/data/optimized-images.json` ve yeni `public/seo-images/` dosyaları birlikte gönderilmeli. Eski izlenen dosyalar korunmuştur. Yeni/aynı URL'de değişen katalog görselleri için manuel bakım komutu `perf-images.md` içinde; otomatik deploy sırasında binlerce kaynak indirilmez. Yeni ürünler bakım öncesinde orijinal görselleriyle görünür.

Yayından sonra ana sayfa/kategori/ürün Lighthouse ölçümleri ve canlı SEO/alışveriş kontrolleri tekrarlanmalı; canlı CDN ve sunucu etkileri yerel ölçümden farklı olabilir. Search Console ve gerçek kullanıcı Core Web Vitals verisi bu yerel kabulün kapsamında ölçülmedi. Üretim hız sonucu doğrulanana kadar burada verilen değerler canlıya ait kabul edilmemeli.
