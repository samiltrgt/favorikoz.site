Plan: @favori_kozmetik_tam_iyileştirme_398151b4.plan.md

Görev: Sadece FAZ 1C (todo: lenis).
SmoothScroll provider + layout; npm i lenis;
gsap.ticker → lenis.raf; lagSmoothing(0); ScrollTrigger.update;
birincil mobil dahil + düşük güçlü/fallback bayrağı; reduced-motion'da kapalı;
1A/1B döngülerini aynı ticker'a bağla (gerekirse minimal dokunuş).

Kapsam dışı: kart CSS (1D), data/caching, SEO.
Önceki: 1B marquee ref; 1A hero tek-ticker. Şimdi Lenis tek saat.

Bittiğinde: değişen dosyalar; test (desktop wheel + mobil + reduced-motion); todo completed.
