export type ProductSeoOverride = {
  expectedName: string
  title?: string
  description?: string
  heading: string
  paragraphs: string[]
  facts: { label: string; value: string }[]
  selectionNote?: string
}

// Verified against read-only catalog snapshot in docs/seo-baseline.json (2026-10-07).
// Price, stock and rating always come from live data. Claims beyond catalog facts are omitted.
export const productSeoOverrides: Record<string, ProductSeoOverride> = {
  "microbrush-100lu-4sxx1b3fk": {
    "expectedName": "Microbrush 100'lü",
    "description": "100 adet tek kullanımlık Microbrush aplikatör, kirpik ve kaş işlemlerinde küçük alanlara kontrollü ürün uygulamak için kullanılır. İnce ve esnek uç yapısına sahiptir.",
    "heading": "Microbrush 100’lü: hassas uygulama yardımcıları",
    "paragraphs": [
      "100 adet tek kullanımlık Microbrush aplikatör, kirpik ve kaş işlemlerinde küçük alanlara kontrollü ürün uygulamak için kullanılır. İnce ve esnek uç yapısına sahiptir.",
      "İnce ve esnek uçlu aplikatör arıyorsanız bu ürünü değerlendirebilirsiniz. Uygulanacak primer veya temizleyicinin kendi talimatlarını ayrıca kontrol edin; aplikatör, kullanılan kozmetik ürünün yerine geçmez."
    ],
    "facts": [
      {
        "label": "Paket",
        "value": "100 adet"
      },
      {
        "label": "Ürün türü",
        "value": "Tek kullanımlık mikro aplikatör"
      }
    ],
    "selectionNote": "Uç ölçüsü ve renk seçeneği için bilgi alabilirsiniz.",
    "title": "Microbrush 100’lü Aplikatör | Favori Kozmetik"
  },
  "profesyonel-ipek-kirpik-cimbizi-no855-727": {
    "expectedName": "Profesyonel Ipek Kirpik Cımbızı No:855",
    "description": "No:855, ipek kirpik uygulamalarına yönelik paslanmaz çelik profesyonel cımbız modelidir.",
    "heading": "No:855 ipek kirpik cımbızı seçimi",
    "paragraphs": [
      "No:855, ipek kirpik uygulamalarına yönelik paslanmaz çelik profesyonel cımbız modelidir.",
      "Diğer kirpik cımbızlarıyla karşılaştırırken model numarasını ve ürün görselindeki uç biçimini esas alın. Elinizdeki cımbızla aynı uç yapısını arıyorsanız yalnızca model adına dayanarak uyumluluk varsaymayın."
    ],
    "facts": [
      {
        "label": "Model",
        "value": "No:855"
      },
      {
        "label": "Malzeme",
        "value": "Çelik"
      },
      {
        "label": "özelliği",
        "value": "Paslanmaz"
      }
    ],
    "selectionNote": "Uç açısını ve uzunluğu sipariş öncesinde teyit edin.",
    "title": "İpek Kirpik Cımbızı No:855 | Favori Kozmetik"
  },
  "profesyonel-ipek-kirpik-cimbizi-no856-716": {
    "expectedName": "Profesyonel Ipek Kirpik Cımbızı No:856",
    "description": "No:856, ipek kirpik uygulamaları için paslanmaz çelik cımbız modelidir. Diğer modellerle karşılaştırırken No:856 model numarasını esas alabilirsiniz.",
    "heading": "No:856 ipek kirpik cımbızı seçimi",
    "paragraphs": [
      "No:856, ipek kirpik uygulamaları için paslanmaz çelik cımbız modelidir. Diğer modellerle karşılaştırırken No:856 model numarasını esas alabilirsiniz.",
      "No:855 ve diğer modellerden seçim yaparken görsellerdeki uç şekillerini karşılaştırın. Kirpik ayırma veya yerleştirme görevi için belirli bir uç açısı gerekiyorsa sipariş öncesinde model ölçüsünü teyit edin."
    ],
    "facts": [
      {
        "label": "Model",
        "value": "No:856"
      },
      {
        "label": "Malzeme",
        "value": "Çelik"
      },
      {
        "label": "özelliği",
        "value": "Paslanmaz"
      }
    ],
    "selectionNote": "Uç açısını ve uzunluğu sipariş öncesinde teyit edin.",
    "title": "İpek Kirpik Cımbızı No:856 | Favori Kozmetik"
  },
  "ibeauty-lb-15-ml-kirpik-primer-kirpik-yag-temizleyici-106": {
    "expectedName": "ibeauty lb 15 ml Kirpik Primer Kirpik Yağ Temizleyici",
    "description": "ibeauty lb kirpik primer, kirpik yüzeyindeki yağ, kir ve toz kalıntılarının temizlenmesine yönelik 15 ml hazırlık ürünüdür.",
    "heading": "ibeauty lb kirpik primer: 15 ml hazırlık ürünü",
    "paragraphs": [
      "ibeauty lb kirpik primer, kirpik yüzeyindeki yağ, kir ve toz kalıntılarının temizlenmesine yönelik 15 ml hazırlık ürünüdür.",
      "Kirpik primeri ile kirpik yapıştırıcısı farklı ürün gruplarıdır. Bu sayfadaki ürün primer olarak listelenir; yapıştırıcı arıyorsanız ilgili kategorideki yapıştırıcı ürünlerini ayrıca inceleyin."
    ],
    "facts": [
      {
        "label": "Hacim",
        "value": "15 ml"
      },
      {
        "label": "Ürün türü",
        "value": "Kirpik primer / yağ temizleyici"
      }
    ],
    "selectionNote": "Ambalajdaki kullanım ve göz çevresi uyarılarını esas alın.",
    "title": "ibeauty lb Kirpik Primer 15 ml | Favori Kozmetik"
  },
  "permania-kalici-makyaj-boyasi-dudak-boyasi-pembe-10ml-533": {
    "expectedName": "Permania Kalıcı Makyaj Boyası Dudak Boyası Pembe 10ml",
    "description": "Permania pembe dudak pigmenti, kalıcı makyaj uygulamaları için su bazlı bir üründür. Şişe hacmi 10 ml’dir.",
    "heading": "Permania pembe dudak pigmenti: renk ve hacim",
    "paragraphs": [
      "Permania pembe dudak pigmenti, kalıcı makyaj uygulamaları için su bazlı bir üründür. Şişe hacmi 10 ml’dir.",
      "Renk seçerken ürün adındaki pembe tonunu ve ambalaj etiketini birlikte değerlendirin. Kalıcı makyaj pigmentlerini günlük sürülen dudak makyaj ürünleriyle aynı kullanımda değerlendirmeyin."
    ],
    "facts": [
      {
        "label": "Renk",
        "value": "Pembe"
      },
      {
        "label": "Hacim",
        "value": "10 ml"
      },
      {
        "label": "formülü",
        "value": "Su bazlı"
      }
    ],
    "selectionNote": "Pigment kodunu, içerik listesini ve profesyonel uygulama talimatlarını kontrol edin.",
    "title": "Permania Pembe Dudak Pigmenti 10 ml | Favori Kozmetik"
  },
  "permania-kalici-makyaj-boyasi-kas-boyasi-soluk-kahve-10ml-542": {
    "expectedName": "Permania Kalıcı Makyaj Boyası Kaş Boyası Soluk Kahve 10ml",
    "description": "Permania soluk kahve kaş pigmenti, kalıcı makyaj uygulamaları için su bazlı bir üründür. Şişe hacmi 10 ml’dir.",
    "heading": "Permania soluk kahve kaş pigmenti",
    "paragraphs": [
      "Permania soluk kahve kaş pigmenti, kalıcı makyaj uygulamaları için su bazlı bir üründür. Şişe hacmi 10 ml’dir.",
      "Kaş pigmenti seçerken soluk kahve tonunu hedeflenen sonuçla karşılaştırın. Ürün adı renk tanımı sağlar; uygulama sonrası herkeste aynı renk sonucu veya aynı kalıcılık süresi anlamına gelmez."
    ],
    "facts": [
      {
        "label": "Renk",
        "value": "Soluk kahve"
      },
      {
        "label": "Hacim",
        "value": "10 ml"
      },
      {
        "label": "formülü",
        "value": "Su bazlı"
      }
    ],
    "selectionNote": "Pigment kodunu, içerik listesini ve profesyonel uygulama talimatlarını kontrol edin.",
    "title": "Permania Soluk Kahve Kaş Pigmenti 10 ml | Favori Kozmetik"
  },
  "profesyonel-cimbiz-no111-720": {
    "expectedName": "Profesyonel Cımbız No:111",
    "description": "No:111, profesyonel cımbız modelidir. Kişisel bakım kategorisindeki cımbızlar arasında model numarasıyla ayırt edilebilir.",
    "heading": "Profesyonel cımbız No:111 model bilgisi",
    "paragraphs": [
      "No:111, profesyonel cımbız modelidir. Kişisel bakım kategorisindeki cımbızlar arasında model numarasıyla ayırt edilebilir.",
      "İhtiyacınıza uygun uç biçimini ürün görsellerinden inceleyin. Belirli bir uygulama için seçim yapıyorsanız uç ölçüsünü teyit edin."
    ],
    "facts": [
      {
        "label": "Model",
        "value": "No:111"
      },
      {
        "label": "Ürün türü",
        "value": "Cımbız"
      }
    ],
    "selectionNote": "İhtiyacınıza uygun uç tipi ve uzunluk için bilgi alabilirsiniz.",
    "title": "Profesyonel Cımbız No:111 | Favori Kozmetik"
  },
  "profesyonel-yumusak-9lu-makyaj-fircasi-sungerli-siyah-508": {
    "expectedName": "Profesyonel Yumuşak 9'lu Makyaj Fırçası Süngerli Siyah",
    "description": "Siyah süngerli makyaj fırçası seti, farklı boyutlarda dokuz fırçayı bir araya getirir. Doğal kıl yapısına sahip fırçalar içerir.",
    "heading": "Siyah 9’lu makyaj fırçası ve sünger seti",
    "paragraphs": [
      "Siyah süngerli makyaj fırçası seti, farklı boyutlarda dokuz fırçayı bir araya getirir. Doğal kıl yapısına sahip fırçalar içerir.",
      "Tek fırça yerine farklı boyutları birlikte değerlendirmek isteyenler için set içeriği karşılaştırması yapılabilir. Fırçaların her birinin şeklini görsellerden kontrol ederek mevcut makyaj ekipmanınıza ekleyeceğiniz parçaları belirleyin."
    ],
    "facts": [
      {
        "label": "Set",
        "value": "9’lu fırça seti"
      },
      {
        "label": "Renk",
        "value": "Siyah"
      },
      {
        "label": "Ürün adındaki ek parça",
        "value": "Sünger"
      }
    ],
    "selectionNote": "Fırçaların ayrı ölçülerini ve sünger adedini teyit edebilirsiniz.",
    "title": "Siyah Süngerli Makyaj Fırçası Seti 9’lu | Favori Kozmetik"
  },
  "iha-kantasi-kisisel-kullanimlik-kalem-kantasi-12li-set-416": {
    "expectedName": "İha Kantaşı Kişisel Kullanımlık Kalem Kantaşı 12'li Set",
    "description": "İha kişisel kullanımlık kalem kantaşı, 12’li set halinde sunulur. Kalem biçimi ve paket adedi, tekli ürünlerle karşılaştırmada dikkate alınabilir.",
    "heading": "İha kalem kantaşı: 12’li paket",
    "paragraphs": [
      "İha kişisel kullanımlık kalem kantaşı, 12’li set halinde sunulur. Kalem biçimi ve paket adedi, tekli ürünlerle karşılaştırmada dikkate alınabilir.",
      "Birden fazla kişisel kullanım ürünü arıyorsanız paket miktarını alışveriş ihtiyacınızla karşılaştırın. Kişisel kullanımda ambalaj talimatlarını esas alın."
    ],
    "facts": [
      {
        "label": "Paket",
        "value": "12 adet"
      },
      {
        "label": "Biçim",
        "value": "Kalem kantaşı"
      }
    ],
    "selectionNote": "İçerik, gramaj ve kullanım talimatları için ambalaj bilgisini kontrol edin.",
    "title": "İha Kalem Kantaşı 12’li Set | Favori Kozmetik"
  },
  "kapakli-jilet-takilabilir-renkli-celik-sakal-usturasi-paslanmaz-mat-beyazkirmizimavi-403": {
    "expectedName": "Kapaklı Jilet Takılabilir Renkli Çelik Sakal Usturası - Paslanmaz Mat Beyaz/Kırmızı/Mavi",
    "description": "Kapaklı sakal usturası, jilet takılabilir paslanmaz çelik gövdeye sahiptir. Kapaklı tasarımı ile diğer ustura modellerinden ayrılır.",
    "heading": "Kapaklı jilet takılabilir çelik ustura",
    "paragraphs": [
      "Kapaklı sakal usturası, jilet takılabilir paslanmaz çelik gövdeye sahiptir. Kapaklı tasarımı ile diğer ustura modellerinden ayrılır.",
      "Ustura gövdesi ile kullanılacak jiletin ayrı özellikleri olduğunu dikkate alın. Sipariş öncesinde istediğiniz renk ve kutu içeriğini teyit edin; renk seçeneklerini ayrıca kontrol edin."
    ],
    "facts": [
      {
        "label": "Ürün türü",
        "value": "Jilet takılabilir sakal usturası"
      },
      {
        "label": "Malzeme",
        "value": "Paslanmaz çelik"
      },
      {
        "label": "Tasarım",
        "value": "Kapaklı"
      }
    ],
    "selectionNote": "Renk seçeneğini, jilet uyumunu ve jiletin kutuya dahil olup olmadığını teyit edin.",
    "title": "Kapaklı Jilet Takılabilir Çelik Sakal Usturası | Favori Kozmetik"
  },
  "klasik-celik-sakal-usturasi-geleneksel-ustura-paslanmaz-jiletsiz-488": {
    "expectedName": "Klasik Çelik Sakal Usturası Geleneksel Ustura- Paslanmaz Jiletsiz",
    "description": "Klasik sakal usturası, paslanmaz çelik model olarak sunulur. Jiletsiz ürün arıyorsanız kutu içeriğini sipariş öncesinde teyit edebilirsiniz.",
    "heading": "Klasik çelik sakal usturası: ürün içeriğini kontrol edin",
    "paragraphs": [
      "Klasik sakal usturası, paslanmaz çelik model olarak sunulur. Jiletsiz ürün arıyorsanız kutu içeriğini sipariş öncesinde teyit edebilirsiniz.",
      "Satın almadan önce bıçak yapısını ve pakete dahil parçaları teyit edin. Kullandığınız bıçak sistemiyle aynı yapıda olup olmadığını satın almadan önce kontrol edin."
    ],
    "facts": [
      {
        "label": "Ürün türü",
        "value": "Klasik sakal usturası"
      },
      {
        "label": "malzeme",
        "value": "Paslanmaz çelik"
      },
      {
        "label": "paket tanımı",
        "value": "Jiletsiz"
      }
    ],
    "selectionNote": "Bıçak yapısını, ölçüleri ve kutu içeriğini sipariş öncesinde teyit edin.",
    "title": "Klasik Paslanmaz Çelik Sakal Usturası | Favori Kozmetik"
  },
  "appro-classic-5000-2400-watt-profesyonel-sac-kurutma-fon-makinesi-r9el64a74": {
    "expectedName": "Appro Classic 5000 2400 Watt Profesyonel Saç Kurutma Fon Makinesi",
    "description": "Appro Classic 5000, 2400 W güce sahip saç kurutma ve fön makinesidir. AC motor, iki hız, üç ısı ayarı ve soğuk hava butonu ile sunulur.",
    "heading": "Appro Classic 5000: güç ve kontrol seçenekleri",
    "paragraphs": [
      "Appro Classic 5000, 2400 W güce sahip saç kurutma ve fön makinesidir. AC motor, iki hız, üç ısı ayarı ve soğuk hava butonu ile sunulur.",
      "Fön makinesi seçiminde watt değerinin yanında ısı ve hız kontrolünü de karşılaştırabilirsiniz. Bu modelde açıklanan ayarlar, farklı kurutma ve şekillendirme ihtiyaçlarını değerlendirirken kullanılabilecek ürün bilgileridir."
    ],
    "facts": [
      {
        "label": "Model",
        "value": "Classic 5000"
      },
      {
        "label": "Güç",
        "value": "2400 W"
      },
      {
        "label": "ayarları",
        "value": "2 hız / 3 ısı"
      },
      {
        "label": "motor tipi",
        "value": "AC"
      }
    ],
    "selectionNote": "Ağırlık, kablo uzunluğu, başlık sayısı ve garanti bilgileri için bilgi alabilirsiniz.",
    "title": "Appro Classic 5000 Fön Makinesi 2400 W | Favori Kozmetik"
  },
  "profesyonel-ahsap-sac-fircasi-no38-195": {
    "expectedName": "Profesyonel Ahşap Saç Fırçası No:38",
    "description": "No:38 saç fırçası, ahşap gövdeye ve esnek, yuvarlak uçlu kıllara sahiptir. Ahşap gövdeli saç fırçası arayanlar için değerlendirilebilir.",
    "heading": "Ahşap saç fırçası No:38",
    "paragraphs": [
      "No:38 saç fırçası, ahşap gövdeye ve esnek, yuvarlak uçlu kıllara sahiptir. Ahşap gövdeli saç fırçası arayanlar için değerlendirilebilir.",
      "Ahşap gövdeli fırça arıyorsanız ürünün biçimini ve başlık genişliğini görsellerden karşılaştırabilirsiniz. Model numarası fırça çapı veya santimetre ölçüsü olarak yorumlanmamalıdır."
    ],
    "facts": [
      {
        "label": "Model",
        "value": "No:38"
      },
      {
        "label": "Gövde",
        "value": "Ahşap"
      },
      {
        "label": "uç yapısı",
        "value": "Yuvarlak uçlu kıllar"
      }
    ],
    "selectionNote": "Başlık ölçüsü ve kıl malzemesi için bilgi alabilirsiniz.",
    "title": "Ahşap Saç Fırçası No:38 | Favori Kozmetik"
  },
  "profesyonel-antistatik-tarak-sekil-tarak-seti-2li-set-769": {
    "expectedName": "Profesyonel Antistatik Tarak Şekil Tarak Seti 2'li Set",
    "description": "İki parçalı antistatik şekil tarak seti, saç şekillendirme için aralıklı ve kalın dişli taraklardan oluşur.",
    "heading": "İkili antistatik şekil tarak seti",
    "paragraphs": [
      "İki parçalı antistatik şekil tarak seti, saç şekillendirme için aralıklı ve kalın dişli taraklardan oluşur.",
      "Şekillendirme tarağı seçerken diş aralığını ve tarak biçimini görsellerden değerlendirin. Set olarak sunulması, farklı şekilleri tek siparişte karşılaştırmak isteyenler için dikkate alınabilecek bir özelliktir."
    ],
    "facts": [
      {
        "label": "Paket",
        "value": "2’li set"
      },
      {
        "label": "Ürün türü",
        "value": "Antistatik şekil tarağı"
      }
    ],
    "selectionNote": "Tarak ölçüleri ve sıcak hava uygulamasına uygunluğu için üretici bilgisini kontrol edin.",
    "title": "Antistatik Şekil Tarak Seti 2’li | Favori Kozmetik"
  },
  "profesyonel-sac-fircasi-1015-412": {
    "expectedName": "Profesyonel Saç Fırçası 1015",
    "description": "1015 model saç fırçası, hafif yapı ve kaymaz tutma yeriyle sunulur. Salon ve evde saç bakımında kullanılabilecek fırçalar arasındadır.",
    "heading": "1015 saç fırçası: model ve tutuş",
    "paragraphs": [
      "1015 model saç fırçası, hafif yapı ve kaymaz tutma yeriyle sunulur. Salon ve evde saç bakımında kullanılabilecek fırçalar arasındadır.",
      "Mevcut fırçanızla karşılaştırırken başlık biçimi ve tutma yerini görsellerden inceleyin. Ürün kodu olan 1015, çap veya boyut bilgisi değildir."
    ],
    "facts": [
      {
        "label": "Model",
        "value": "1015"
      },
      {
        "label": "tutuş özelliği",
        "value": "Kaymaz tutma yeri"
      }
    ],
    "selectionNote": "Başlık çapını ve sıcak hava uygulamasına uygunluğu teyit edebilirsiniz.",
    "title": "Profesyonel Saç Fırçası 1015 | Favori Kozmetik"
  },
  "sac-dolgunlastirici-keratin-fibers-siyah-topik-sac-tozu-50gr-916": {
    "expectedName": "Saç Dolgunlaştırıcı Keratin Fibers Siyah Topik Saç Tozu 50gr",
    "description": "Siyah keratin fibers saç tozu, saçın daha dolgun görünmesine yönelik 50 gr kozmetik üründür.",
    "heading": "Siyah keratin fibers saç tozu: renk ve miktar",
    "paragraphs": [
      "Siyah keratin fibers saç tozu, saçın daha dolgun görünmesine yönelik 50 gr kozmetik üründür.",
      "Renk seçerken saçınızın mevcut tonuyla siyah ürünün uyumunu değerlendirin. Bu ürün saç görünümüne yönelik kozmetik bir seçenek olarak ele alınmalı; saç çıkarma veya saç dökülmesini tedavi etme sonucu beklenmemelidir."
    ],
    "facts": [
      {
        "label": "Renk",
        "value": "Siyah"
      },
      {
        "label": "Miktar",
        "value": "50 gr"
      },
      {
        "label": "Ürün türü",
        "value": "Keratin fibers saç tozu"
      }
    ],
    "selectionNote": "İçerik listesi ve kullanım uyarıları için ambalaj bilgisini esas alın.",
    "title": "Siyah Keratin Fibers Saç Tozu 50 gr | Favori Kozmetik"
  },
  "runail-uv-filtreli-top-coat-18ml-rubber-base-scotch-18ml-non-acid-primer-15ml-1769633477751-0lxkqz": {
    "expectedName": "RUNAİL UV Filtreli Top Coat 18ml + Rubber Base Scotch 18ml + Non-Acid Primer 15ml",
    "description": "RUNAİL seti, 18 ml UV filtreli top coat, 18 ml Rubber Base Scotch ve 15 ml Non-Acid Primer olmak üzere üç ürünü bir araya getirir.",
    "heading": "RUNAİL top coat, rubber base ve primer seti",
    "paragraphs": [
      "RUNAİL seti, 18 ml UV filtreli top coat, 18 ml Rubber Base Scotch ve 15 ml Non-Acid Primer olmak üzere üç ürünü bir araya getirir.",
      "Baz, üst kat ve hazırlık ürünü farklı uygulama aşamalarına yöneliktir. Seti değerlendirirken kullandığınız sistemin üretici talimatlarını ve her şişenin ambalaj bilgisini kontrol edin; üç ürünün kuruma yöntemi aynı kabul edilmemelidir."
    ],
    "facts": [
      {
        "label": "Top coat",
        "value": "18 ml"
      },
      {
        "label": "Rubber Base Scotch",
        "value": "18 ml"
      },
      {
        "label": "Non-Acid Primer",
        "value": "15 ml"
      }
    ],
    "selectionNote": "Lamba uygunluğu ve kürleme sürelerini her ürünün üretici talimatından kontrol edin.",
    "title": "RUNAİL Top Coat 18 ml + Base 18 ml + Primer 15 ml | Favori Kozmetik"
  },
  "renkli-tirnak-tasi-seti-12li-nail-art-susleme-parlak-kristal-boncuk-seti-y4yxfv27p": {
    "expectedName": "Renkli Tırnak Taşı Seti 12'Li Nail Art Süsleme Parlak Kristal Boncuk Seti",
    "description": "12’li renkli tırnak taşı seti, farklı renklerde kristal boncuk ve nail art süsleri içerir. Saklama kutusu ile sunulur.",
    "heading": "12’li renkli tırnak taşı seti",
    "paragraphs": [
      "12’li renkli tırnak taşı seti, farklı renklerde kristal boncuk ve nail art süsleri içerir. Saklama kutusu ile sunulur.",
      "Nail art tasarımınız için renkleri ve taş biçimlerini ürün görsellerinden karşılaştırın. Taşların sabitlenmesi için gerekli ürünlerin setin içinde olduğunu varsaymayın; kutu içeriğini ayrıca kontrol edin."
    ],
    "facts": [
      {
        "label": "Set",
        "value": "12’li"
      },
      {
        "label": "Ürün türü",
        "value": "Renkli tırnak taşı / nail art süsü"
      },
      {
        "label": "ambalajı",
        "value": "Saklama kutusu"
      }
    ],
    "selectionNote": "Taş ölçülerini, toplam adedi ve kutuya dahil parçaları teyit edebilirsiniz.",
    "title": "Renkli Nail Art Tırnak Taşı Seti 12’li | Favori Kozmetik"
  },
  "cift-fanli-toz-toplama-240-watt-zxpy9l3ha": {
    "expectedName": "Çift Fanlı Toz Toplama 240 Watt",
    "description": "Çift fanlı 240 W toz toplama cihazı, manikür ve protez tırnak işlemlerinde oluşan tozu toplamaya yönelik bir ekipmandır.",
    "heading": "Çift fanlı 240 W tırnak tozu toplama cihazı",
    "paragraphs": [
      "Çift fanlı 240 W toz toplama cihazı, manikür ve protez tırnak işlemlerinde oluşan tozu toplamaya yönelik bir ekipmandır.",
      "Toz toplama cihazı seçiminde fan sayısı ve güç kadar filtre tipi, yedek parça temini ve çalışma alanına uygun boyutlar da önem taşır. Cihazı yerleştireceğiniz alanın ölçüsünü satın almadan önce kontrol edin."
    ],
    "facts": [
      {
        "label": "Güç",
        "value": "240 W"
      },
      {
        "label": "Fan yapısı",
        "value": "Çift fan"
      },
      {
        "label": "kullanım alanı",
        "value": "Manikür / protez tırnak"
      }
    ],
    "selectionNote": "Filtre tipi, yedek parça, boyutlar ve hava debisi için bilgi alabilirsiniz.",
    "title": "Çift Fanlı Tırnak Tozu Toplayıcı 240 W | Favori Kozmetik"
  },
  "pododisk-medium-baslik-ve-yedek-zimpara-100-adet-462": {
    "expectedName": "PODODİSK MEDİUM BAŞLIK VE YEDEK ZIMPARA 100 ADET",
    "description": "Pododisk Medium seti, ayak bakımı için başlık ve 100 adet yedek zımparayı bir araya getirir.",
    "heading": "Pododisk Medium başlık ve 100 adet yedek zımpara",
    "paragraphs": [
      "Pododisk Medium seti, ayak bakımı için başlık ve 100 adet yedek zımparayı bir araya getirir.",
      "Mevcut cihazınız için başlık seçerken bağlantı ölçüsünü ve uygun devir bilgisini teyit edin. Medium ifadesi tek başına milimetre çap veya tüm cihazlarla uyumluluk anlamına gelmez."
    ],
    "facts": [
      {
        "label": "Başlık",
        "value": "Medium"
      },
      {
        "label": "Yedek zımpara",
        "value": "100 adet"
      },
      {
        "label": "kullanım alanı",
        "value": "Ayak bakımı"
      }
    ],
    "selectionNote": "Başlık çapını, bağlantı ölçüsünü ve zımpara grit değerini cihazınızla karşılaştırın.",
    "title": "Pododisk Medium Başlık + Yedek Zımpara 100 Adet | Favori Kozmetik"
  }
}
