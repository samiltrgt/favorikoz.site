# NES Portal'da UUID Nasıl Bulunur?

Konnektör bağlantısını kaydettin ama UUID'yi göremiyorsan şu yerleri kontrol et:

---

## 1. Tablo Listesinde ID Kolonu

**Konnektör Bağlantıları** sayfasındaki tabloda:

- **"ID"** veya **"UUID"** veya **"Entegrasyon ID"** gibi bir kolon var mı bak.
- Varsa, yeni oluşturduğun bağlantının satırında UUID'yi göreceksin.
- Örnek format: `a4b9de66-ae76-44b0-9855-bc6d8ead4f52` (8-4-4-4-12 karakter)

---

## 2. Satıra Tıkla (Detay Sayfası)

- Tablodaki **yeni oluşturduğun bağlantının satırına** tıkla.
- Açılan detay sayfasında veya modal'da:
  - **"ID"**, **"UUID"**, **"Entegrasyon ID"**, **"Bağlantı ID"** gibi bir alan olmalı.
  - Bazen **"Kod"** veya **"Referans"** olarak da görünebilir.

---

## 3. URL'de UUID

- Bağlantının detay sayfasına gittiğinde **tarayıcı adres çubuğuna** bak.
- URL şöyle bir şey olabilir:
  ```
  https://portaltest.nes.com.tr/management/connector/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  ```
- `/connector/` sonrasındaki **UUID kısmını** kopyala.

---

## 4. Düzenleme / Ayarlar Butonu

- Tablodaki satırın sağında **dişli (⚙️)** veya **"Düzenle"** butonu var mı?
- Tıkla → açılan form veya sayfada UUID görünebilir.
- Bazen **"Görüntüle"** veya **"Detay"** butonu da olabilir.

---

## 5. Tarayıcı Developer Tools (F12)

- Sayfayı açık tut, **F12** → **Network** sekmesi.
- Bağlantıyı kaydettiğinde veya sayfayı yenilediğinde giden API isteklerine bak.
- Response'larda **"id"**, **"uuid"**, **"connectorId"** gibi alanlarda UUID görünebilir.

---

## 6. Alternatif: API ile Listele

Eğer NES API'den konnektör listesini çekebiliyorsan:

```http
GET https://portaltest.nes.com.tr/api/connectors
Authorization: Bearer {NES_API_KEY}
```

Response'da oluşturduğun bağlantının UUID'si görünebilir. (API endpoint'i NES Portal dokümantasyonunda olabilir.)

---

## 7. Eğer Hiçbir Yerde Yoksa

**NES desteğine yaz:**

> "Konnektör Bağlantıları bölümünde yeni bağlantı oluşturdum ama UUID'sini göremiyorum. E-arşiv fatura için createinvoice API'sinde kullanacağım pazaryeri UUID'sini nereden alabilirim? Oluşturduğum konnektör bağlantısının UUID'si mi kullanılacak, yoksa başka bir bölümden mi almalıyım?"

**Email:** entegrasyon@nesbilgi.com.tr

---

## Önemli Not

Bazen **"Konnektör Bağlantıları"** pazaryeri UUID'si için doğru yer olmayabilir. NES Portal'da şu bölümleri de kontrol et:

- **"Pazaryeri"** / **"Marketplace"** (ayrı bir menü olabilir)
- **"Entegrasyonlar"** / **"Integrations"**
- **"E-Arşiv"** / **"E-Arşiv Fatura"** altında pazaryeri ayarları
- **"API Ayarları"** / **"API Settings"**

Bu bölümlerden birinde pazaryeri entegrasyonu oluşturup UUID alman gerekebilir.

---

## UUID Bulduktan Sonra

UUID'yi bulduğunda:

1. **.env.local:**
   ```env
   NES_MARKETPLACE_ID=buldugun-uuid-buraya
   ```

2. **Vercel:** Settings → Environment Variables → `NES_MARKETPLACE_ID` → UUID'yi yapıştır

3. **Deploy / restart** sonrası fatura isteğini tekrar dene.
