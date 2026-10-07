# Yayın sonrası kontrol ve ana sayfa isteği

Kullanıcının işaretlediği ana sayfa giriş bloğu, başlık, açıklama ve beş kategori düğmesiyle birlikte kaldırıldı. Bu değişiklik çalışma dosyalarında; mevcut canlı sürümde hâlâ eski blok bulunuyor. Mevcut Protez Tırnak Setleri başlığı h1 olarak kullanıldı, CSS aynı görünümü korur; yeni veya gizli bir SEO metin bloğu eklenmedi.

Canlı alan adı kontrolü: `https://www.favorikozmetik.com` 308 ile `https://favorikozmetik.com` adresine yönleniyor. Mevcut canlı canonical, sitemap ve robots sitemap adresleri hâlâ www kullanıyor. Bu tutarsızlık `src/lib/site-url.ts` içinde düzeltildi: fallback apex olur; eski www ortam ayarı da aynı üretim origin'ine normalize edilir. İlgili 9 SEO testi ve TypeScript kontrolü geçti. Düzeltmenin canlıya geçmesi için yeni sürümün yayımlanması gerekir.

`seo-acceptance-live.json` gerçek ana alan adından alınan HTTP/HTML ve mobil alışveriş kontrolünün kanıtlarını içerir. Araca mevcut canlı sürümün eski www canonical origin'i ayrıca verilmiştir. Bu yüzden bu kontrollerin başarılı olması www→apex tutarsızlığının canlıda düzeldiği anlamına **gelmez**. Sonraki deploy'dan sonra varsayılan apex beklentisiyle tekrar çalıştırılmalıdır:

```
node scripts/verify-seo.mjs https://favorikozmetik.com docs/seo-acceptance-live.json
```

Canlı mobil laboratuvar ölçümleri `seo-performance-live.json` içinde: ana sayfa LCP 11,27 sn, Tırnak 7,42 sn, Toz Toplayıcı 2,88 sn, Tüm Ürünler 3,79 sn, Microbrush 6,66 sn. Tüm örneklerde CLS yaklaşık 0,003–0,005. Bunlar tek tur CPU4x/1,6Mbps laboratuvar ölçümleri; gerçek kullanıcı CWV raporu değildir. Özellikle ana sayfa ve ana kategori performansı hâlâ iyileştirme gerektiriyor. Önceki yerel sonuçlar canlı sonuç yerine sunulmamalı.

Search Console erişimi ve harici Google Rich Results sonucu mevcut değil. Sitemap gönderimi, URL Inspection ve indeksleme/arama performansı takibi bu erişim sağlanınca yapılabilir.
