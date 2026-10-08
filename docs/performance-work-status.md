# Performans çalışması — devam kaydı

## Nihai durum — 8 Ekim 2026

Uygulama, root incelemesi/onarımı ve yerel kabul tamamlandı. Nihai teslim `docs/performance-delivery.md`, sayısal kanıt `docs/performance-comparison.json`. Deploy/commit yapılmadı. Aşağıdaki eski ara kayıt tamamlanmış kabul kontrollerinden önce yazılmıştır; güncel durum bu bölümdür.

- Son build102route,70test/12suite, Node manifest güvenlik testi ve son TypeScript kontrolü geçti.
- 48SEO/alışveriş kontrolü ve6browser senaryosu geçti. Sipariş gönderilmedi. Mobil/masaüstü JS açık/kapalı, ekrandaki görseller, carousel/banner etkileşimleri ve immutable HTTP başlığı doğrulandı.
- 7266görsel bağımsız decode/genişlik ve hash kontrolünden geçti.403KBmanifest server-only sınırına taşındı; son build home124KB/product120KB.
- Üç local home run ortancası LCP16,15→4,92sn; puan59→80; transfer2,80→0,79MB. Aynı ayarlar doğrulandı. Kategori tek çift5,26→4,55sn; ürün3,06→2,77sn. Canlı sonucu değildir.
- CSS/font/polyfill incelemesi tamamlandı; kalan fırsatlar teslimde açık. LCP hâlâ2,5sn altında değil.
- Ayrı Fontenay değişiklikleri korundu. Yeni türevler201MiB deploy alanı kullanır; tümü bir ziyaretçiye indirilmez. Kod+manifest+public/seo-images birlikte yayınlanmalı.

Bekleyen yerel başarısız kontrol yok. Yayın sonrasında canlı Lighthouse/SEO/alışveriş ve gerçek kullanıcı ölçümleri tekrarlanmalı. Ham yerel Lighthouse/trace/screenshot dosyaları ignored; kompakt karşılaştırma/kabul raporları tutuluyor. Görsel bakım komutları `docs/perf-images.md` içinde.

## Tarihsel ara kayıt

Kullanıcı kapsamı: Lighthouse LCP 16,2 sn; FCP 2,3 sn; TBT 50 ms; CLS 0,002; Speed Index 7,2 sn. Ayrıntılı raporda yaklaşık 1,6MiB görsel tasarrufu ve 440ms render-blocking CSS fırsatı. Üst metrik ile LCP alt bölümünün ~2,51sn toplamı arasındaki fark Lighthouse aynı run/trace ile araştırılacak, varsayılmayacak.

Başlangıç Git çalışma alanı temiz. Kullanıcı alt ajanları ve basit/okuma işleri için GPT-6 Luna'yı yetkilendirdi. Kullanıcının son isteği performans kodunu uygulamak ve root incelemesiyle kontrol etmek; otomatik deploy henüz bu aşamada yapılmadı.

Görev sahipleri:
- `/root/perf_inventory`: GPT-6 Luna, read-only envanter, yalnız `docs/perf-inventory.md` raporu.
- `/root/perf_render`: ilk ekran / priority / animasyon / carousel / layout okuma, belirtilen komponentler; checkpoint `docs/perf-render.md`.
- `/root/perf_images`: katalog geneli responsive türevler, loader, script ve image testleri; checkpoint `docs/perf-images.md`.
- `/root`: aynı Lighthouse koşullarında baseline + after, CSS/font incelenmesi, alt ajan review ve onarım, build/SEO/cart ve görsel doğrulama, son teslim.

Geçerli üretim adresi `https://favorikozmetik.com`; www 308 yönlenir. Önceki SEO adres normalizasyonu ve ana sayfa giriş bloğu kaldırılması artık Git'e kaydedilmiş. İlk SEO teslim geçmişi `docs/seo-delivery.md` içinde; performans bunun devamıdır.

Kabul: aynı mobil Lighthouse koşulları before/after, gerçek LCP node/altbölümler, kritikte JS/animasyon bağımlılığı kalmaması, görüntüleri doğru çözünürlükte gönderme, tip/build ve ilgili meaningfultestler, SEO/alışverişte regression olmaması. Yeni lokal build sonucu canlıya yayımlanmış gibi raporlanmayacak. TBT düşük/CLS iyi durum korunmalı.

Durum (8 Ekim devamı): kesinti sonrası iki ajan yeniden başlatıldı. Canlı Lighthouse 13.5/Chrome141 ölçümü `perf-lighthouse-live-before.json`: simulated LCP18,095sn; aynı trace observed2,519sn. Bu fark simulated throttling ile observed insight farkı; kart animasyonunun bütün gecikmeyi açıkladığı iddia edilmiyor.

Karşılaştırılabilir baseline: Git HEAD arşivi `.perf-baseline/` içinde ayrı build edildi, port3101. 3 Lighthouse mobil run `perf-lighthouse-local-before-{1,2,3}.json`: LCP15,71/16,57/16,15sn; toplam transfer yaklaşık2,8MB. Üretim build başarıyla tamamlandı.

İlk değişiklik build'i geçti; port3102. Root review 403KB manifestin istemciye gönderilmesinin ürün firstloadJS122→206KB büyüttüğünü buldu. Görsel ajanına server-only çözümleyiciyle manifesti clientbundle'dan çıkarması için onarım verildi. Final build ve after ölçümleri bu onarım bitince yapılacak.

Görsel üretimi2436kaynak/2444alias,7266referansdosya; tüm1181ürün+2428ana/galeriURL+banner/logolar. Üretim dosyaları içerik hash'li; eski172trackedasset korunuyor. Yeni run kesilirse yarımmanifestyayımlamamak için script root tarafından incelemeye alındı. Bağımsız Luna encodedwidth doğrulaması sürüyor.

Render ajanı31test veTypeScript geçirdi; root hala JSoff/mobile/desktop tarayıcı, before/after Lighthouse vealışveriş/SEO regression kontrolünü yapacak. Aynı çalışmaalanında ayrıFontenayadmin/home-data değişiklikleri var; geri alınmayacak, bizim değişikliklerle karıştırılmayacak. CSS/font değerlendirmesi ve düşüköncelikli12KBpolyfill fırsatı teslimde ayrıca açıklanacak.

Kesinti olursa bu dosya + üç agent checkpoint + Git diff üzerinden devam edilir, tamamlanmamış adımlar atlanmaz.
