# "Pazaryesi tanımı bulunamadı!" (accountMarketPlaceSetting) Hatası

Bu hata NES API'den döndüğünde anlamı:

**NES, kullandığın `NES_MARKETPLACE_ID` (pazaryeri UUID) için senin hesabında bir pazaryeri kaydı bulamıyor.**

---

## Ne Yapmalısın?

### 1. Swagger örnek UUID kullanma

Projede veya dokümandaki örnek UUID (örn. `d3557de7-07ca-43ee-bde7-ae4f45a658f8`) **sadece dokümantasyon içindir**. Gerçek API isteğinde bu ID çalışmaz; NES "pazaryesi tanımı bulunamadı" döner.

### 2. Kendi pazaryeri UUID'ni kullan

- **NES Developer Portal**'a gir: https://developertest.nes.com.tr (test) / canlı için NES’in verdiği portal adresi.
- **Konnektör Bağlantıları** (veya Pazaryeri / Marketplace) bölümüne git.
- Kendi **pazaryeri entegrasyonunu** oluştur veya mevcut kaydı aç.
- Orada görünen **entegrasyon UUID**’sini kopyala.
- Bu UUID’yi projede kullan:
  - **.env.local:** `NES_MARKETPLACE_ID=buraya-yapistir`
  - **Vercel:** Settings → Environment Variables → `NES_MARKETPLACE_ID` değerini bu UUID ile güncelle.
- Deploy / yeniden başlatma sonrası tekrar dene.

### 3. Pazaryeri henüz yoksa

Portal’da “Pazaryeri entegrasyonu” / “Marketplace” oluşturma seçeneği varsa oradan yeni kayıt oluştur; NES’in atadığı UUID’yi alıp yukarıdaki gibi `NES_MARKETPLACE_ID` yap.

Nasıl oluşturulacağı veya hangi menüde olduğu net değilse:

- **NES dokümantasyon:** https://developertest.nes.com.tr/docs/
- **NES entegrasyon desteği:** entegrasyon@nesbilgi.com.tr  

Onlara “e-arşiv fatura için pazaryeri entegrasyonu oluşturmak istiyorum, marketplace UUID’yi nereden alacağım?” diye sorabilirsin.

---

## Özet

| Durum | Yapılacak |
|--------|-----------|
| `accountMarketPlaceSetting` / "Pazaryesi tanımı bulunamadı!" | NES Portal’dan **kendi** pazaryeri UUID’nizi alın; `NES_MARKETPLACE_ID` olarak kullanın (env + Vercel). |
| Pazaryeri kaydı yok | Portal’da oluşturun veya NES desteğine yazın. |

Bu hata kod kaynaklı değildir; doğru marketplace ID ile çözülür.
