export type CategorySeoGuide = {
  title: string
  description: string
  heading: string
  intro: string
  sections: Array<{ heading: string; text: string }>
}

// Category names and product groups verified against docs/seo-baseline.json,
// collected 2026-10-07. Editorial guidance is not a manufacturer specification.
// Overrides are keyed by actual catalog slug; no database migration is needed.
export const CATEGORY_SEO: Record<string, CategorySeoGuide> = {
  tirnak: {
    title: 'Tırnak ve Protez Tırnak Malzemeleri',
    description: 'Kalıcı oje, tırnak jeli, protez tırnak malzemeleri, freze uçları ve tırnak cihazlarını inceleyin; uygulama ihtiyacınıza göre karşılaştırın.',
    heading: 'Tırnak malzemelerini uygulama ihtiyacına göre seçin',
    intro: 'Tırnak kategorisinde renk ürünleri, jeller, yardımcı malzemeler ve cihazlar ayrı gruplarda yer alır. Alışverişe başlamadan önce mevcut malzemelerinizi ve tamamlamak istediğiniz uygulama adımını belirleyin. Böylece aynı işlevdeki ürünleri tekrar almak yerine eksik parçaya odaklanabilirsiniz.',
    sections: [
      { heading: 'Renk ürünleri ve jel grupları', text: 'Kalıcı oje ile tırnak jellerini ayrı kategorilerde karşılaştırabilirsiniz. Ürün adındaki marka, renk ve ambalaj bilgisiyle başlayın; ürün açıklamasındaki kullanım amacını kontrol edin. Bir ürünün başka bir sistemle birlikte kullanılabileceğini yalnızca kategori adına bakarak varsaymayın. Gerekli cihaz ve uygulama koşulları için üreticinin ürün talimatı belirleyicidir.' },
      { heading: 'Alet, uç ve cihaz seçimi', text: 'Törpü ve buffer, fırçalar, freze uçları ve cihazlar aynı ihtiyacı karşılamaz. Önce yapmak istediğiniz işlemi, ardından elinizdeki ekipmanı dikkate alın. Freze ucu veya cihaz seçerken bağlantı uyumluluğunu ve model bilgisini ürün sayfasından kontrol edin. Katalogda belirtilmeyen güç, hız veya uyumluluk bilgilerini satın almadan önce sorun.' },
      { heading: 'Set mi, tek ürün mü?', text: 'Profesyonel protez tırnak setleri ile tekli ürünleri karşılaştırırken sadece ürün sayısına değil setin açıklanan içeriğine bakın. Halihazırda sahip olduğunuz malzemeleri çıkarıp gerçekten ihtiyaç duyduğunuz parçaları listeleyin. Fiyat, stok ve paket içeriği her ürünün kendi sayfasında değerlendirilmelidir.' },
    ],
  },
  'kalici-oje': {
    title: 'Kalıcı Oje ve Jel Oje Ürünleri',
    description: 'Kalıcı oje seçeneklerini marka, renk ve ürün bilgileriyle inceleyin. Base coat ve top coat ürünlerini ayrıca değerlendirerek alışverişinizi tamamlayın.',
    heading: 'Kalıcı oje seçerken nelere bakmalı?',
    intro: 'Kalıcı oje alışverişinde renk seçimi kadar mevcut uygulama sisteminiz de önemlidir. Ürün listesinden ilginizi çeken seçenekleri açarak marka, ürün adı ve açıklamayı birlikte değerlendirin. Görsellerdeki renkler ekran ve ışığa göre farklı görünebilir; varsa ürünün renk kodunu da dikkate alın.',
    sections: [
      { heading: 'Renk, marka ve ambalajı karşılaştırın', text: 'Birbirine yakın tonları karşılaştırırken ürün adı ve renk kodu üzerinden ilerlemek seçimi kolaylaştırır. Ambalaj miktarı açıklanmışsa bunu fiyatla birlikte değerlendirin. Aynı marka adı altında farklı ürün serileri bulunabileceğinden, daha önce kullandığınız ürünle aynı olduğunu yalnızca görseline bakarak kabul etmeyin.' },
      { heading: 'Base coat ve top coat ayrı adımlardır', text: 'Base coat alt kat, top coat üst kat ürün gruplarıdır. Renk ürününü seçerken mevcut alt ve üst kat ürünlerinizin uyumluluğunu üretici bilgileri üzerinden kontrol edin. Bu gruplara Tırnak kategorisindeki Protez Tırnak Malzemeleri bölümünden ulaşabilirsiniz. Her ürünün kullanım sırası ve cihaz gereksinimi kendi talimatına göre değerlendirilmelidir.' },
      { heading: 'Uygulama bilgisi eksikse önce doğrulayın', text: 'Kategori sayfası ürünleri keşfetmek içindir; uygulama süresi veya cihaz ayarı için ürün talimatının yerine geçmez. Açıklamada yer almayan kürleme süresi, kat sayısı veya kalıcılık süresi hakkında varsayım yapmayın. Satın alma öncesinde ürün sayfasındaki bilgiyi ve güncel stok durumunu kontrol edin.' },
    ],
  },
  'ipek-kirpik': {
    title: 'İpek Kirpik ve Kirpik Uygulama Malzemeleri',
    description: 'İpek kirpikler, kirpik cımbızları, yapıştırıcılar, sökücüler ve lifting setlerini ürün gruplarına göre inceleyin.',
    heading: 'Kirpik ürünlerini kullanım amacına göre ayırın',
    intro: 'İpek Kirpik kategorisi kirpik seçeneklerinin yanında cımbız, yapıştırıcı, sökücü ve lifting seti gibi farklı ürün gruplarını içerir. İhtiyacınızın yeni bir kirpik seçimi mi, uygulama aracı mı, yoksa mevcut malzemeyi tamamlama mı olduğunu belirleyerek ilgili alt kategoriye geçebilirsiniz.',
    sections: [
      { heading: 'Kirpik ve cımbız seçiminde ürün bilgisi', text: 'Kirpik ürünlerinde belirtilen ölçü ve model bilgilerini, cımbızlarda ise uç formu ve ürün açıklamasını karşılaştırın. Her cımbızın her uygulama tekniğine uygun olduğunu varsaymayın. Benzer görünen modeller arasındaki farkı ürün adları ve mevcut açıklamalar üzerinden inceleyin; belirtilmemiş özellikler için destek isteyin.' },
      { heading: 'Yapıştırıcı ve sökücü aynı ürün grubu değildir', text: 'Yapıştırıcılar ve sökücüler ayrı işlevlere sahip ürünlerdir; seçim ve kullanımda üreticinin talimatı esas alınmalıdır. Ürün sayfasında açıklanmışsa saklama koşullarını, kullanım alanını ve ambalaj bilgisini kontrol edin. Kategori adı tek başına göz çevresinde kullanım uygunluğu veya bütün ürünlerle uyumluluk anlamına gelmez.' },
      { heading: 'Lifting setinin içeriğini kontrol edin', text: 'Lifting setlerini kirpik uzatma malzemelerinden ayrı değerlendirin. Set seçerken açıklanan paket içeriğine ve mevcut malzemelerinize bakın. Katalogda yazmayan uygulama sayısı veya sonuç süresi hakkında tahminde bulunmayın. Profesyonel uygulama gereksinimleri ve ürün uyarıları için üreticinin bilgilerini takip edin.' },
    ],
  },
  'kuafor-malzemeleri': {
    title: 'Kuaför Malzemeleri, Fön ve Tıraş Makineleri',
    description: 'Fön makineleri, tıraş makineleri ve diğer kuaför malzemelerini inceleyin. Model ve açıklanan ürün özellikleriyle seçenekleri karşılaştırın.',
    heading: 'Kuaför ekipmanını ihtiyacınıza göre karşılaştırın',
    intro: 'Kuaför Malzemeleri kategorisinde fön makineleri, tıraş makineleri ve diğer kuaför ürünleri ayrı bölümlerde listelenir. Önce ihtiyaç duyduğunuz ürün grubunu belirlemek, farklı amaçlara yönelik cihazları yalnızca fiyat üzerinden karşılaştırmanızı önler.',
    sections: [
      { heading: 'Fön makinesi seçiminde model bilgisi', text: 'Fön makinelerinde marka ve model adını ürün açıklamasıyla birlikte değerlendirin. Güç, hız veya ısı ayarları belirtilmişse bu bilgileri karşılaştırma listenize ekleyin. Ürün adı veya fotoğrafı üzerinde yer almayan teknik özellikleri kategori genelinden çıkarmayın. Başlık ve diğer parçaların pakete dahil olup olmadığını ürünün açıklanan içeriğinden kontrol edin.' },
      { heading: 'Tıraş makinesinde kullanım amacı', text: 'Tıraş makinelerini incelerken istediğiniz kullanım alanı ile ürün açıklamasını eşleştirin. Kablosuz çalışma, taraklar veya aksesuarlar hakkında yalnızca model için doğrulanmış bilgilere dayanarak karar verin. Paket içeriği farklı olabileceği için benzer modeller arasında geçiş yaparken açıklamayı yeniden okuyun.' },
      { heading: 'Mevcut ekipmanı tamamlama', text: 'Yeni bir cihaz almadan önce mevcut ekipmanınızın modelini ve eksik parçalarını not edin. Aksesuar uyumluluğu yalnızca benzer görünümden anlaşılmaz; model bağlantısını doğrulayın. Listede aradığınız ürün grubu görünmüyorsa diğer kuaför malzemelerini de inceleyebilirsiniz. Güncel fiyat ve stok bilgisi ürün sayfasında yer alır.' },
    ],
  },
  'sac-bakimi': {
    title: 'Saç Bakımı, Şekillendiriciler, Fırça ve Taraklar',
    description: 'Saç bakım ürünleri, saç şekillendiriciler, fırça ve tarak seçeneklerini inceleyin; ihtiyacınıza göre ilgili alt kategoriye geçin.',
    heading: 'Saç bakım alışverişini ürün grubuna göre planlayın',
    intro: 'Saç Bakımı kategorisinde bakım ürünleri, şekillendiriciler, fırça ve taraklar ile saç topik ürünleri ayrı gruplarda yer alır. Önce günlük rutininizde hangi ürünü tamamlamak istediğinizi belirleyin; ardından ilgili alt kategorideki seçenekleri karşılaştırın.',
    sections: [
      { heading: 'Bakım ve şekillendirme ürünlerini ayırın', text: 'Bakım ürünleriyle şekillendiricileri aynı amaç için seçmeyin. Ürünün açıklanan kullanım alanını ve varsa içerik bilgisini okuyun. Saç tipinize uygunluk veya belirli bir sonuç hakkında karar verirken kategori adı yerine üreticinin ürün bilgisini dikkate alın. Açıklanmayan etki, içerik veya uygulama sıklığı hakkında çıkarım yapmayın.' },
      { heading: 'Fırça ve tarak seçimi', text: 'Fırça ve tarakları ürünün biçimi, boyutu ve açıklanan kullanım amacı üzerinden karşılaştırabilirsiniz. Görseller ürünü tanımaya yardımcı olur; malzeme veya ısıya dayanım gibi özellikler ayrıca belirtilmedikçe doğrulanmış sayılmaz. Yeni bir fırça ya da tarak alırken elinizdeki ürünün hangi ihtiyacınızı karşılamadığını belirlemek seçimi kolaylaştırır.' },
      { heading: 'Renk ve kullanım bilgilerini kontrol edin', text: 'Saç topik gibi renk seçimi bulunan ürünlerde ürün adı ve açıklanan renk bilgisini kontrol edin. Paket miktarı belirtilmişse fiyatı bununla birlikte değerlendirin. Ürün sayfası satın alma öncesi bilgi kaynağınızdır; kullanımda ambalaj talimatlarını esas alın. Görsellerin ekran ayarlarına göre farklı görünebileceğini dikkate alın.' },
    ],
  },
}
