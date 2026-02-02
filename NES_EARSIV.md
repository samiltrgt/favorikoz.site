# NES e-Arşiv Fatura Entegrasyonu

Bu proje, ödeme başarılı olduktan sonra NES Portal üzerinden e-arşiv fatura keser ve siparişe kaydeder.

## Gerekli Ortam Değişkenleri

| Değişken | Gerekli | Açıklama |
|----------|--------|----------|
| `NES_API_BASE_URL` | **Evet** | NES API ana adresi (sonunda `/` olmadan). Test: `https://developertest.nes.com.tr`, Canlı: NES’ten alınacak. |
| `NES_CLIENT_ID` | **Evet** | NES Portal’dan alınan API Client ID. |
| `NES_CLIENT_SECRET` | **Evet** | NES Portal’dan alınan API Secret. |

Bu üçü dolu ve `NES_INVOICE_ENABLED` `false` değilse fatura entegrasyonu açık sayılır.

## NES_API_BASE_URL, NES_CLIENT_ID, NES_CLIENT_SECRET nereden bulunur?

1. **NES hesabınız olmalı**  
   NES e-fatura / e-arşiv hizmeti için NES ile sözleşme yapıp portal erişimi almanız gerekir. Henüz yoksa: [nes.com.tr](https://nes.com.tr) veya **satis@nes.com.tr** üzerinden başvurun.

2. **Portala giriş**  
   - Adres: **[https://portal.nes.com.tr](https://portal.nes.com.tr)**  
   - Giriş sayfası sizi **[https://id.nes.com.tr](https://id.nes.com.tr)** üzerinden kimlik doğrulamaya yönlendirir. NES’in verdiği kullanıcı adı ve parola ile giriş yapın.

3. **API kodları (Client ID & Secret)**  
   - Giriş yaptıktan sonra: **[https://portal.nes.com.tr/management/apis](https://portal.nes.com.tr/management/apis)**  
   - Bu sayfada “API Yönetimi” / “API Kodları” benzeri bir bölüm bulunur.  
   - Yeni bir API kodu oluşturun veya mevcut olanı seçin.  
   - **Client ID** (veya “API Kodu” / “Client Id”) ve **Secret** (güvenlik anahtarı) burada gösterilir; bir kez gösterilip saklanması istenebilir, dikkatle kopyalayın.  
   - Bunları `.env.local` içinde `NES_CLIENT_ID` ve `NES_CLIENT_SECRET` olarak kullanın.

4. **Base URL (NES_API_BASE_URL)**  
   - **Test ortamı:** NES test için genelde `https://developertest.nes.com.tr` kullanılır. Dokümantasyon: [developertest.nes.com.tr/docs](https://developertest.nes.com.tr/docs).  
   - **Canlı ortam:** Kesin canlı API adresi NES tarafından (sözleşme, e-posta veya portal içi dokümanla) verilir. Örnek: `https://api.nes.com.tr` veya NES’in söylediği farklı bir adres olabilir.  
   - Sonunda `/` olmadan yazın: `NES_API_BASE_URL=https://developertest.nes.com.tr`

5. **Bulamıyorsanız**  
   Portal arayüzü değişmiş veya “API Yönetimi” menüsü farklı bir isimde olabilir. Resmi adımlar ve canlı base URL için:  
   - **entegrasyon@nesbilgi.com.tr** (teknik / entegrasyon)  
   - **satis@nes.com.tr** (hesap / sözleşme)

### Portalda sadece “API Listesi” ve “Yetki Listesi” görünüyorsa

API Listesi sayfasında (örn. **favorikoz.site** kaydı) sadece açıklama ve yetkiler (earchive, einvoice vb.) görünüyor; **Client ID** ve **Secret** bu ekranda yer almıyor. Bunlar genelde şu yollardan birinde olur:

- **İşlemler sütunu:** Tabloda ilgili API satırının yanındaki **İşlemler** (veya üç nokta / dropdown) menüsüne tıklayın. Açılan menüde “Detay”, “API Anahtarları”, “Credentials”, “Güvenlik Anahtarı” veya benzeri bir seçenek olabilir; orada **Client ID** ve **Secret** gösterilir. Birçok portalde Secret sadece **ilk oluşturma** anında bir kez gösterilir; o an kopyalanmamışsa yenileme (regenerate) gerekir.
- **Ayrı bir “Geliştirici” / “API Anahtarları” sayfası:** Sol menüde veya üst menüde “Geliştirici Ayarları”, “API Anahtarları”, “OAuth Uygulamaları” gibi bir sayfa varsa orada da listelenebilir.
- **Hiçbir yerde yoksa:** Client ID ve Secret’ı NES’in size e-posta ile göndermiş olması veya sadece uygulama oluşturulurken tek seferlik göstermesi mümkün. Bu durumda **entegrasyon@nesbilgi.com.tr** veya **satis@nes.com.tr** ile iletişime geçip şunları isteyin:
  - “favorikoz.site” API entegrasyonu için **Client ID** ve **Client Secret** (veya mevcut secret’ı yenileme).
  - E-arşiv fatura için kullanacağınız **API Base URL** (test ve canlı için ayrı adresler olabilir).

**NES_API_BASE_URL** genelde API Listesi sayfasında değil, NES’in geliştirici dokümanında veya size ilettiği e-postada yer alır. Test için çoğu zaman `https://developertest.nes.com.tr` kullanılır; canlı adres için NES’ten onay alın.

## İsteğe Bağlı Ortam Değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `NES_TOKEN_PATH` | `/token` | OAuth2 token endpoint yolu (BASE_URL’e eklenir). NES dokümanı farklı path verirse buradan override edin. |
| `NES_INVOICE_PATH` | `/api/v1/earchive/invoices` | E-arşiv fatura oluşturma endpoint yolu. NES dokümanına göre güncelleyin. |
| `NES_INVOICE_ENABLED` | `true` | Fatura kesimini tamamen kapatmak için `false` yapın. |

## Credential ve Endpoint Bilgisi

- **API kodları (Client ID / Secret):** NES v2 portalında [API Yönetimi](https://portal.nes.com.tr/management/apis) sayfasından tanımlanır ve oradan alınır.
- **Test ortamı:** Base URL olarak `https://developertest.nes.com.tr` kullanılabilir (NES’in test dokümantasyonunda geçer).
- **Token ve fatura path’leri:** NES’in size verdiği API dokümanında (Swagger / PDF) token ve e-arşiv fatura endpoint path’leri yazar. Dokümandaki path’ler farklıysa `NES_TOKEN_PATH` ve `NES_INVOICE_PATH` ile projedeki varsayılanları override edin.
- **Destek:** Endpoint ve alan isimleri için NES entegrasyon ekibi: entegrasyon@nesbilgi.com.tr veya satış: satis@nes.com.tr.

## Örnek .env.local

```env
# Zorunlu
NES_API_BASE_URL=https://developertest.nes.com.tr
NES_CLIENT_ID=your_client_id_from_portal
NES_CLIENT_SECRET=your_client_secret_from_portal

# İsteğe bağlı (NES dokümanına göre)
# NES_TOKEN_PATH=/oauth/token
# NES_INVOICE_PATH=/api/v2/earchive/fatura
# NES_INVOICE_ENABLED=true
```

## Akış

1. Ödeme Iyzico’da başarılı olunca `/api/payment/status` tetiklenir.
2. Sipariş `paid` yapılır.
3. NES yapılandırılmışsa token alınır (OAuth2 client_credentials), e-arşiv fatura isteği gönderilir.
4. Başarılı yanıtta gelen `uuid` ve varsa `pdfUrl` siparişe (`invoice_uuid`, `invoice_pdf_url`, `invoiced_at`) yazılır.
5. Müşteri “Siparişlerim” sayfasında fatura kesilmiş siparişlerde “Fatura İndir” ile PDF’e gidebilir.

## Fatura Gövdesi (buildNesPayload)

Projedeki varsayılan e-arşiv gövdesi Türkçe alan adlarıyla (örn. `aliciAdi`, `kalemler`, `toplamTutar`) oluşturuluyor. NES’in resmi API’si farklı alan adları (İngilizce veya farklı isimlendirme) kullanıyorsa `src/lib/nes.ts` içindeki `buildNesPayload` ve yanıt parse’ı (uuid, pdfUrl) NES dokümanına göre güncellenmelidir.
