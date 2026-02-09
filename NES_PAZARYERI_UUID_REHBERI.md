# NES Pazaryeri UUID Bulma - Kapsamlı Rehber

Bu rehber, NES Portal'da pazaryeri entegrasyon UUID'sini (`NES_MARKETPLACE_ID`) nasıl bulacağını adım adım anlatır.

---

## 📋 Özet

**Pazaryeri UUID'si** (`NES_MARKETPLACE_ID`), NES API'de `createinvoice` endpoint'inde kullanılır:

```
POST /einvoice/v1/uploads/marketplaces/{id}/orders/createinvoice
```

Bu `{id}` parametresi, **NES Portal'da oluşturduğun pazaryeri entegrasyonunun UUID'sidir**.

---

## 🔍 UUID'yi Bulmanın Yolları

### 1. Konnektör Bağlantıları (Konnektör Bağlantıları)

**Portal adresi:** `https://portaltest.nes.com.tr/management/connector` (test) veya canlı portal

**Adımlar:**
1. Portal'a gir → **Yönetim Paneli** → **Konnektör Bağlantıları**
2. Yeni bağlantı oluştur veya mevcut bağlantıyı aç
3. UUID'yi şu yerlerde bulabilirsin:
   - **Tablo listesinde:** "ID" veya "UUID" kolonu
   - **Detay sayfasında:** Satıra tıklayınca açılan sayfada
   - **URL'de:** `/connector/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` formatında
   - **Düzenleme formunda:** Dişli (⚙️) butonuna tıklayınca

**Not:** Eğer burada UUID görünmüyorsa, bu form pazaryeri için değil ERP konnektörü için olabilir. Aşağıdaki alternatif yollara bak.

---

### 2. Pazaryeri / Marketplace Menüsü (Eğer varsa)

Portal'da şu menüleri kontrol et:

- **"Pazaryeri"** / **"Marketplace"**
- **"Entegrasyonlar"** / **"Integrations"**
- **"E-Arşiv"** → **"Pazaryeri Ayarları"**
- **"E-Fatura"** → **"Pazaryeri Entegrasyonları"**

Bu bölümlerde pazaryeri entegrasyonlarını listeleyen bir sayfa olabilir; orada UUID görünebilir.

---

### 3. API ile Pazaryeri Listesi Çekme

NES API'den pazaryeri listesini çekmek için bir endpoint olabilir. Swagger'da şu endpoint'leri kontrol et:

**Test ortamı Swagger:**
- https://apitest.nes.com.tr/einvoice/index.html

**Aranacak endpoint'ler:**
- `GET /v1/marketplaces` (pazaryeri listesi)
- `GET /v1/integrations` (entegrasyon listesi)
- `GET /v1/connectors` (konnektör listesi)

**Örnek istek (Postman / curl):**
```bash
curl -X GET "https://apitest.nes.com.tr/einvoice/v1/marketplaces" \
  -H "Authorization: Bearer {NES_API_KEY}"
```

Response'da pazaryeri listesi ve UUID'leri görünebilir.

---

### 4. Portal API Endpoint'leri (F12 → Network)

1. Portal'a gir → **Konnektör Bağlantıları** veya **Pazaryeri** sayfasına git
2. **F12** → **Network** sekmesi
3. Sayfayı yenile veya bir bağlantıya tıkla
4. Giden API isteklerine bak:
   - `GET /api/connectors` veya `/api/marketplaces` gibi istekler
   - Response'larda `id`, `uuid`, `connectorId` gibi alanlarda UUID görünebilir

**Örnek response:**
```json
{
  "data": [
    {
      "id": "a4b9de66-ae76-44b0-9855-bc6d8ead4f52",
      "title": "Favori Kozmetik",
      "connectionAddress": "https://www.favorikozmetik.com"
    }
  ]
}
```

---

### 5. Portal URL'den UUID Çıkarma

Bazı portal sayfalarında UUID URL'de görünür:

```
https://portaltest.nes.com.tr/management/connector/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
https://portaltest.nes.com.tr/management/marketplace/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Bu UUID'yi kopyalayıp kullanabilirsin.

---

### 6. NES Desteğinden UUID İsteme

Eğer hiçbir yerde UUID bulamazsan:

**Email:** entegrasyon@nesbilgi.com.tr

**Mesaj örneği:**
> Merhaba,
> 
> E-arşiv fatura entegrasyonu için `createinvoice` API'sinde kullanacağım pazaryeri entegrasyon UUID'sini bulamıyorum. Portal'da "Konnektör Bağlantıları" bölümünde bağlantı oluşturdum ama UUID'sini göremiyorum.
> 
> Pazaryeri UUID'sini nereden alabilirim? Portal'da hangi bölümden veya hangi API endpoint'inden bu UUID'yi çekebilirim?
> 
> Teşekkürler.

---

## ✅ UUID Bulduktan Sonra

UUID'yi bulduğunda:

1. **`.env.local`:**
   ```env
   NES_MARKETPLACE_ID=buldugun-uuid-buraya
   ```

2. **Vercel:** Settings → Environment Variables → `NES_MARKETPLACE_ID` → UUID'yi yapıştır

3. **Deploy / restart** sonrası fatura isteğini tekrar dene

---

## 🔧 Alternatif: Pazaryeri Oluşturma

Eğer pazaryeri entegrasyonu henüz yoksa:

1. **Portal'da pazaryeri oluşturma formunu bul** (Konnektör Bağlantıları veya Pazaryeri menüsü)
2. **Formu doldur:**
   - **Başlık:** "Favori Kozmetik" veya "Favori Kozmetik Web"
   - **Bağlantı Adresi:** `https://www.favorikozmetik.com`
   - **Auth Token:** NES API Key'in (veya boş bırak, NES atar)
   - **ERP:** "Diğer" / "Web" / "Pazaryeri" (varsa)
3. **Kaydet** → UUID'yi al

---

## 📝 Notlar

- **Swagger örnek UUID'leri kullanma:** Dokümantasyondaki örnek UUID'ler (örn. `d3557de7-07ca-43ee-bde7-ae4f45a658f8`) gerçek istekte çalışmaz; "Pazaryesi tanımı bulunamadı!" hatası alırsın.
- **UUID formatı:** Genelde `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` formatında (36 karakter, 8-4-4-4-12).
- **Test vs Canlı:** Test ortamında (`portaltest.nes.com.tr`) oluşturduğun pazaryeri UUID'si sadece test API'sinde (`apitest.nes.com.tr`) çalışır. Canlı için canlı portal'da pazaryeri oluşturman gerekir.

---

## 🆘 Hala Bulamıyorsan

1. **Portal menülerini tek tek kontrol et:** Tüm menü öğelerine tıklayıp pazaryeri/entegrasyon sayfalarını ara
2. **F12 → Network:** Portal'daki her sayfada Network sekmesine bak, API response'larında UUID ara
3. **NES desteğine yaz:** entegrasyon@nesbilgi.com.tr

Bu rehberi takip ederek UUID'yi bulabilirsin. Eğer portal'da farklı bir yapı varsa, NES desteği sana doğru yolu gösterecektir.
