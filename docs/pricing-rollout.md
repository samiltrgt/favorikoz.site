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

## 7 Ekim 2026 canlı işlem durumu

- Yayın commit'i: `675587b5e558ac3bb67565135f347e90a6ce277e`; uzak `main` bu commit'e ilerletildi. Fiyat değişiklikleri mevcut SEO çalışmalarından ayrı hazırlandı.
- 19 uygulama tablosunun yerel JSON yedeği `.pricing-backups/2026-10-07T18-07-29-505Z/` altında; dosya sayıları ve SHA-256 değerleri doğrulandı. Bu, Auth ve şema dahil tam PostgreSQL dump değildir.
- Sunucu yedeği `pricing_backup.release_20261007`; işlemden hemen önce tüm ürünlerin tam kopyası `pricing_backup.products_pre_cutover_20261007`. Şema istemci rollerine kapalı, tablolar RLS ile korunuyor.
- 2.499 ürünün fiyat birimi kuruşa dönüştürüldü. 199 geçmiş sipariş değişmedi.
- Düzeltilmiş Excel importu 1.115 güncelleme, 0 ekleme, 0 hata ile tamamlandı. Mükerrerler dahil 1.141 eşleşen kayıtta fiyat farkı yok; 1.181 aktif ürün korunuyor. Mükerrerleri ayrıca güncellemek gerekmiyor.
- Önizleme `dpl_J8kQCkeUSvB3XZcfsm5Rq5aUBt9r` READY; ürün API'sinde 175 ve 6500 TL doğrulandı. Üretim ortamının ayrı e-posta/Meta değişkenleri bulunduğu için bu önizleme doğrudan canlı kabul edilmedi.
- **Canlı geçiş tamamlandı; site yeniden açık.** Kullanıcı geçici bakım kuralını açıkça onayladı. API firewall erişimi 404 verdiği için Vercel panelinden yalnızca production ortamına Deny kuralı eklendi ve yayımlandı. Proje yeniden açılınca HTTP 403 bakım engeli doğrulandı.
- Duraklatma sırasında BLOCKED olan deployment yeniden derlenemedi. Önizleme kaynaklı yeniden yayın ortam farklılığı nedeniyle otomatik denetimde reddedildi; bunun yerine geçiş kaydı commit'i ile normal Git production derlemesi başlatıldı. Son commit `bdbb0ca266d9d4983d2c5e79ea06cf2217dfba79`, deployment `dpl_G5v7ote5CUKTGyBe3YZ22iYrRrw4`, target `production`, durum READY. Her iki canlı alan adı bu deployment'a bağlandı. Geçici bakım kuralı panelden kaldırılıp değişiklik yayımlandı.
- Canlı HTTP kontrolü: ana sayfa, sepet, checkout ve ürün API'si 200. Ürün API'si 175 ve 6500 TL; sepet quote API'si bunları 17500 ve 650000 kuruş, toplam 667500 kuruş döndürüyor. Tarayıcıda 175 TL ürün, 100 TL kargo ve 275 TL toplam hem sepette hem checkout'ta doğrulandı. Gerçek tahsilat veya test siparişi oluşturulmadı. Son kontrolde 199 geçmiş siparişin tamamı değişmeden kaldı.
- İki ürünle tarayıcı checkout kontrolü: 175,00 + 6.500,00 = 6.675,00 TL; kargo ücretsiz, ödeme toplamı 6.675,00 TL. Ekran görüntüsü `.pricing-backups/live-checkout.png`. Yerel ana çalışma alanının Git tabanı yayınlanan commit'e dosyaları koruyan `reset --mixed` ile eşitlendi; mevcut SEO çalışmalarına dokunulmadı.
- Geri dönüş seçilirse import sonrası kullanılan tek seferlik fiyat rollback script'i yerine tam ürün snapshot'ından importun değiştirdiği alanlar geri yüklenmeli; siparişlere dokunulmamalı. Ardından eski deployment doğrulanıp proje açılmalı.

## Tamamlanan doğrulama

- Jest: 40 test grubu, 251 test geçti; 11 mevcut test atlandı. Sepet/checkout kupon sözleşmesi, kargo eşiği, eski sepet dönüşümü ve 175 / 6500 / 319,90 TL'nin sipariş ve sağlayıcı tutarları dahil.
- TypeScript: `npm run type-check` geçti.
- `node scripts/verify-pricing-conversion.mjs`: bellek içi PostgreSQL üzerinde ileri dönüşüm, ikinci çalıştırmayı engelleme, fiyat değişince geri dönüşü engelleme, eski fiyatları geri yükleme ve siparişlerin korunması doğrulandı.
- Düzeltilmiş Excel: 1.115 ürünün dry-run kontrolü geçti. Tüm hücreler kaynakla karşılaştırıldı; yalnızca O308 değeri değişti. Başka ürün verisi veya dosya biçimi değişmedi.

## Geri dönüş

Importtan önce `scripts/rollback-product-prices.sql` ve eski kod birlikte kullanılabilir. Script yeni/değişmiş ürün veya fiyat görürse güncel veriyi ezmemek için durur. Yedek `_rolled_back` adıyla korunur. Excel importu veya başka fiyat güncellemesi yapıldıysa otomatik geri dönüş yerine güncel yedek üzerinden ayrı bir dönüşüm hazırlanmalıdır. Sipariş kayıtları geri dönüşte de değiştirilmez.
