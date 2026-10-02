Plan: @favori_kozmetik_tam_iyileştirme_398151b4.plan.md

Görev: Sadece FAZ 2C (todo: caching-isr).
page.tsx force-dynamic + revalidate=10 çelişkisini gider;
ISR / unstable_cache tags:['products'] revalidate~60;
yazma yollarında revalidateTag('products');
cookies() okumayan anon client veya cache sargısı.
Sepet/checkout/auth dynamic kalsın; public API için mümkünse Cache-Control notu.

Kapsam dışı: FAZ 3 SEO rewrite, FAZ 4.
Önceki: 2A tek kaynak, 2B order.

Bittiğinde: değişen dosyalar; test (admin ürün güncelle → tag); todo completed.
