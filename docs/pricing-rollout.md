# Fiyat birimi geçişi

Excel satış fiyatı yalnızca `Trendyol'da Satılacak Fiyat (KDV Dahil)` sütunundan TL olarak okunur. `Piyasa Satış Fiyatı (KDV Dahil)` referans/eski fiyattır. `175.0 → 175,00 TL`, `6500.0 → 6.500,00 TL`, `319.90 → 319,90 TL`.

Yeni kodda ürün veritabanı, sepet, kupon hesaplaması, kargo ve sipariş tutarları tam sayı kuruş kullanır. Ürün API'si ekran için TL döndürür. Kupon tanımındaki sabit indirim TL olarak kalır; hesaplanırken kuruşa çevrilir. Yüzdelik indirim yüzde olarak kalır. Eski siparişler zaten kuruştur ve dönüştürülmez.

## Uygulama sırası

1. Düzeltilmiş Excel kopyasını kullan: `npx tsx scripts/import-excel-to-supabase.ts "<katliurun-duzeltilmis.xlsx dosyasının yolu>" --dry-run`. Hatalı fiyat varken normal import veritabanına yazmadan durur. Kaynaktaki O308 `150.0.` yazım hatası teslim edilen kopyada `150` olarak düzeltildi; orijinal dosya korundu.
2. Geçiş sırasında ödeme ve ürün importlarını durdur. Güncel veritabanı yedeği al. Eski kod + yeni birim veya yeni kod + eski birim birlikte servis edilmemeli.
3. Yönetici SQL oturumunda `scripts/normalize-product-prices.sql` çalıştır. Tüm ürün fiyatları, silinmiş/Excel dışında kalan kayıtlar dahil, 10'a bölünür; ekrandaki mevcut TL korunur. Özel şemada fiyat yedeği tutulur. İkinci çalıştırma aynı yedek tablo nedeniyle durur.
4. Yeni kodu yayınla; ürün API/CDN/ISR önbelleklerini yenile. Ürün, eski tarayıcı sepeti, kupon, kargo ve ödeme toplamını kontrol et. Örnek: 2.100 TL sepet, %10 kupon → 1.890 TL ürün + 100 TL kargo = 1.990 TL. Sıfır gerçek tahsilatla sağlayıcı sandbox testi yapılmalı.
5. Düzeltilmiş Excel'in dry-run kontrolünü yeniden çalıştır; ardından normal importu çalıştır. Excel son fiyat listesidir; eski site ile 93 fiyat farkı beklenen güncellemedir. Barkodsuz 26 ürünün mükerrer kayıtları ayrıca ele alınmalı; bu geçiş ürün silmez.
6. Son fiyatları Trendyol sütunuyla karşılaştırıp ödemeyi yeniden aç.

Kod hazırlığı ve yerel testler canlı veri dönüşümü/import/yayın anlamına gelmez. Bu dosyadaki SQL henüz canlıda uygulanmamıştır.

## Tamamlanan doğrulama

- Jest: 40 test grubu, 251 test geçti; 11 mevcut test atlandı. Sepet/checkout kupon sözleşmesi, kargo eşiği, eski sepet dönüşümü ve 175 / 6500 / 319,90 TL'nin sipariş ve sağlayıcı tutarları dahil.
- TypeScript: `npm run type-check` geçti.
- `node scripts/verify-pricing-conversion.mjs`: bellek içi PostgreSQL üzerinde ileri dönüşüm, ikinci çalıştırmayı engelleme, fiyat değişince geri dönüşü engelleme, eski fiyatları geri yükleme ve siparişlerin korunması doğrulandı.
- Düzeltilmiş Excel: 1.115 ürünün dry-run kontrolü geçti. Tüm hücreler kaynakla karşılaştırıldı; yalnızca O308 değeri değişti. Başka ürün verisi veya dosya biçimi değişmedi.

## Geri dönüş

Importtan önce `scripts/rollback-product-prices.sql` ve eski kod birlikte kullanılabilir. Script yeni/değişmiş ürün veya fiyat görürse güncel veriyi ezmemek için durur. Yedek `_rolled_back` adıyla korunur. Excel importu veya başka fiyat güncellemesi yapıldıysa otomatik geri dönüş yerine güncel yedek üzerinden ayrı bir dönüşüm hazırlanmalıdır. Sipariş kayıtları geri dönüşte de değiştirilmez.

## Production release checkpoint — 2026-10-07

Application backups verified: 19 tables, 2,499 products, 199 orders. Product units converted to integer kurus; latest Excel import updated 1,115 products with zero inserts and zero errors. All 1,141 matched active records agree with the Excel prices; historical orders are unchanged. Temporary production firewall maintenance was explicitly approved by the user and published before resuming builds. This commit triggers a normal Git production build using production environment variables. Remove the temporary maintenance rule only after this build is READY and its source commit is verified.

