import Header from '@/components/header'
import Footer from '@/components/footer'
import { Cookie, FileText, Settings, BarChart3, Zap, Megaphone, Shield, RefreshCw, Mail, Info } from 'lucide-react'

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cookie className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-4 tracking-tight">
              Çerez Politikası
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Web sitemizde kullanılan çerezler hakkında bilgilendirme
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 pb-20">
        {/* Introduction */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 md:p-12 border border-orange-100">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Genel Bilgilendirme
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Favori Kozmetik olarak, web sitemizi ziyaret eden kullanıcılarımızın deneyimini geliştirmek ve hizmetlerimizi daha iyi sunabilmek amacıyla çerezlerden (cookies) faydalanmaktayız. Bu Çerez Politikası, kullanılan çerez türleri ve çerezlerin nasıl yönetileceği hakkında bilgilendirme amacıyla hazırlanmıştır.
            </p>
          </div>
        </section>

        {/* What is Cookie */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Çerez (Cookie) Nedir?
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Çerezler; web siteleri tarafından tarayıcınız aracılığıyla cihazınıza kaydedilen küçük metin dosyalarıdır. Bu dosyalar, site tercihlerinizi hatırlamak ve site kullanımını analiz etmek amacıyla kullanılmaktadır.
              </p>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 mt-4">
                <div className="flex items-start gap-4">
                  <Cookie className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-black mb-2">Çerezlerin Amacı</h3>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Site tercihlerinizi hatırlamak</li>
                      <li>• Kullanıcı deneyimini iyileştirmek</li>
                      <li>• Site kullanımını analiz etmek</li>
                      <li>• Kişiselleştirilmiş içerik sunmak</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cookie Types */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Kullanılan Çerez Türleri
              </h2>
            </div>
            
            <div className="space-y-6">
              {/* Zorunlu Çerezler */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-black">Zorunlu Çerezler</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Web sitemizin düzgün çalışabilmesi için gerekli olan çerezlerdir. Bu çerezler olmadan site fonksiyonları tam olarak çalışmaz.
                </p>
              </div>

              {/* Performans ve Analitik Çerezler */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-black">Performans ve Analitik Çerezler</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Web sitemizin kullanımını analiz etmek, ziyaretçi sayısını ve kullanıcı davranışlarını ölçmek amacıyla kullanılan çerezlerdir. Bu çerezler anonim olarak toplanır ve kullanıcıyı doğrudan tanımlamaz.
                </p>
              </div>

              {/* İşlevsel Çerezler */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-black">İşlevsel Çerezler</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Kullanıcı tercihlerini (dil, bölge vb.) hatırlayarak daha kişiselleştirilmiş bir deneyim sunulmasını sağlar.
                </p>
              </div>

              {/* Pazarlama ve Reklam Çerezleri */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-black">Pazarlama ve Reklam Çerezleri</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Ürün ve hizmetlerimizin tanıtımını yapmak, kullanıcı ilgi alanlarına yönelik içerikler sunmak amacıyla kullanılan çerezlerdir.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Purposes */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 md:p-12 border border-blue-100">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Çerezlerin Kullanım Amaçları
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 mb-6">
              Çerezler;
            </p>
            <div className="space-y-3">
              {[
                'Web sitesinin düzgün çalışmasını sağlamak',
                'Kullanıcı deneyimini geliştirmek',
                'Site performansını analiz etmek',
                'Pazarlama ve reklam faaliyetlerini yürütmek'
              ].map((purpose, index) => (
                <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-4 border border-gray-200">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">{purpose}</span>
                </div>
              ))}
            </div>
            <p className="text-base md:text-lg text-gray-700 mt-6">
              amaçlarıyla kullanılmaktadır.
            </p>
          </div>
        </section>

        {/* Cookie Management */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Çerezlerin Yönetimi
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Tarayıcı ayarlarınızı değiştirerek çerezleri kabul edebilir, reddedebilir veya silebilirsiniz. Ancak çerezlerin devre dışı bırakılması, web sitemizin bazı bölümlerinin düzgün çalışmamasına neden olabilir.
              </p>
              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200 mt-4">
                <div className="flex items-start gap-4">
                  <Info className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-black mb-2">Önemli Uyarı</h3>
                    <p className="text-gray-700">
                      Çerezleri devre dışı bırakırsanız, web sitemizin bazı özellikleri düzgün çalışmayabilir. Zorunlu çerezlerin kabul edilmesi site fonksiyonları için gereklidir.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Third Party Cookies */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Üçüncü Taraf Çerezler
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Web sitemizde; analiz, reklam ve performans ölçümü amacıyla üçüncü taraf hizmet sağlayıcılarına ait çerezler kullanılabilir. Bu çerezlerin yönetimi ilgili üçüncü tarafların kendi gizlilik politikalarına tabidir.
            </p>
          </div>
        </section>

        {/* Updates */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Güncellemeler
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Bu Çerez Politikası, mevzuat ve hizmet kapsamındaki değişikliklere bağlı olarak güncellenebilir. Güncel metin web sitemizde yayımlandığı tarihten itibaren geçerli olur.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 md:p-12 border border-orange-100">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                İletişim
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Çerez Politikası ile ilgili her türlü soru ve talebiniz için bizimle iletişime geçebilirsiniz:
              </p>
              <div className="bg-white rounded-xl p-6 border border-orange-200 mt-4">
                <a 
                  href="mailto:iletisim@favorikozmetik.com" 
                  className="flex items-center gap-3 text-orange-600 hover:text-orange-700 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-semibold text-lg">iletisim@favorikozmetik.com</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}

