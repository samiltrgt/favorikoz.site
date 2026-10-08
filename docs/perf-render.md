# Render performansı: devam kaydı

Güncelleme: 2026-10-08. Bu alt görev deploy veya commit yapmadı.

## Uygulananlar

- ProductCard: hydration sonrası IntersectionObserver ile başlatılan, ilk karede opacity=0 kullanan giriş animasyonu ve sıra başına 50 ms bekleme kaldırıldı. Ürün içeriği doğrudan HTML/CSS ile görünür; sepete ekleme geri bildirimi korunur.
- ProductCard: sıra numarası verilmemiş kart artık lazy/auto. Yalnız açıkça ilk iki sıra numarası gönderilen kartlar eager/high. İlk promo satırı gerçek indeksleri geçirir. Kategori ve tüm ürünler sayfalarının mevcut indeksleri korunur.
- FixedPromoCarousel: kaydırma sırasında kenar durumu değişmedikçe React state yenilenmez. Ok, klavye, dokunma ve scroll-snap korunur.
- HomeEditorialStack: banner otomatik geçişi korunur; pencere yüklenmiş ve alan görünür olmadan başlamaz, alan görünmezken veya reduced-motion açıkken durur. Fare ve klavye odağı ayrı takip edilir. Manuel kontroller hemen çalışır. Görseller ortak ResponsiveImage üzerinden gerçek genişlikte dosyaları kullanır.
- BrandMarquee: GSAP statik import yerine efektte yüklenir; logolar sunucu HTML’sinde görünür kalır. Animasyon yüklenemezse görünür içerik kaybolmaz. Logo dosyaları görsel ajanının site-brands.ts kapsamındadır.
- SmoothScroll: dokunmatik/coarse cihazlar ve reduced-motion için native kaydırma. Masaüstü wheel smoothing GSAP/Lenis/ScrollTrigger dinamik importlarıyla window load sonrası başlar. Unmount öncesi yükleme iptal edilir, ticker ve Lenis temizlenir. Native kaydırma daima başlangıçta kullanılabilir.
- EditorialProductRows: pointer-follow her pointer hareketinde layout okumaz; giriş/resize/scroll aralarında geometri önbelleği kullanılır. Aynı ölçümde CSS tekrar yazılmaz. CSS container birimleriyle ürün kolonları JS olmadan hesaplanır; sağ panelin başlangıç ofseti HTML/CSS’de bulunur. Mobilde 2 kolon, masaüstünde 4 kolon toplamı korunur.

## Doğrulama

- 3 test dosyasında 31 test geçti: product-card (24), smooth-scroll (4), home-editorial-stack (3).
- Komut: `npx jest --modulePathIgnorePatterns=.perf-baseline --runInBand --runTestsByPath __tests__/components/product-card.test.tsx __tests__/components/smooth-scroll.test.tsx __tests__/components/home-editorial-stack.test.tsx`
- İlk denemede otomatik approval review kullanım limiti nedeniyle çalışmadı; limit sonrası tekrar çalıştırılıp sonuç alındı.
- Root kontrolü: production build, mobil/masaüstü görsel kontrol, JS kapalı editorial kolonları ve kaydırma etkileşimleri, aynı koşullarda Lighthouse öncesi/sonrası.

## Ölçüm sınırı

Root canlı trace ilk promo Full Tırnak Seti görselini LCP olarak buldu; bu çalıştırmada banner LCP değildi. Simüle edilen LCP 18,095 sn, gözlemlenen trace LCP 2,519 sn. Kart animasyonunun bütün 16,2 saniyeyi açıkladığı iddia edilmiyor. Beklenen etki: görünürlüğü hydration/animasyona bağlamamak, öncelikli isteklerin yarışını azaltmak ve mobilde gereksiz animasyon kitaplıklarını başlangıç yükünden çıkarmak. Kesin hız kazanımı root karşılaştırmasından sonra raporlanmalı.
