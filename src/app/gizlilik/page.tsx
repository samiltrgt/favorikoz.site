import Header from '@/components/header'
import Footer from '@/components/footer'
import { Lock, Database, Eye, Shield, Share2, Cookie, User, RefreshCw, Mail, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-4 tracking-tight">
              Gizlilik Politikası
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Kişisel bilgilerinizin korunması bizim için önceliktir
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 pb-20">
        {/* Introduction */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 md:p-12 border border-purple-100">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Gizlilik Taahhüdümüz
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Favori Kozmetik olarak, web sitemizi ziyaret eden ve hizmetlerimizden yararlanan kullanıcılarımızın gizliliğine büyük önem veriyoruz. Bu Gizlilik Politikası; kişisel bilgilerinizin hangi kapsamda toplandığını, nasıl kullanıldığını ve nasıl korunduğunu açıklamak amacıyla hazırlanmıştır.
            </p>
          </div>
        </section>

        {/* Collected Information */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Toplanan Bilgiler
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 mb-6">
              Web sitemiz üzerinden sunulan hizmetler kapsamında aşağıdaki bilgiler toplanabilmektedir:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">Kimlik Bilgileri</span>
                </div>
                <p className="text-sm text-gray-600">Ad, soyad</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">İletişim Bilgileri</span>
                </div>
                <p className="text-sm text-gray-600">Telefon numarası ve e-posta adresi</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">Adres Bilgileri</span>
                </div>
                <p className="text-sm text-gray-600">Teslimat ve fatura adresi</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">Ödeme Bilgileri</span>
                </div>
                <p className="text-sm text-gray-600">Sipariş ve ödeme bilgileri</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">Teknik Bilgiler</span>
                </div>
                <p className="text-sm text-gray-600">IP adresi, cihaz ve site kullanım bilgileri</p>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Purpose */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Bilgilerin Kullanım Amacı
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 mb-6">
              Toplanan bilgiler;
            </p>
            <div className="space-y-3">
              {[
                'Sipariş ve teslimat süreçlerinin yürütülmesi',
                'Ödeme ve faturalama işlemlerinin gerçekleştirilmesi',
                'Müşteri destek hizmetlerinin sağlanması',
                'Yasal yükümlülüklerin yerine getirilmesi',
                'Web sitesinin güvenliği ve performansının artırılması'
              ].map((purpose, index) => (
                <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-4 border border-gray-200">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{purpose}</span>
                </div>
              ))}
            </div>
            <p className="text-base md:text-lg text-gray-700 mt-6">
              amaçlarıyla kullanılmaktadır.
            </p>
          </div>
        </section>

        {/* Data Protection */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-8 md:p-12 border border-green-100">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Bilgilerin Korunması
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Kişisel verilerinizin güvenliği için Favori Kozmetik tarafından gerekli teknik ve idari tedbirler alınmaktadır. Web sitemiz, güvenli bağlantı (SSL) altyapısı ile korunmakta olup, bilgileriniz yetkisiz erişime karşı güvenli şekilde muhafaza edilmektedir.
              </p>
              <div className="bg-white rounded-xl p-6 border border-green-200 mt-4">
                <div className="flex items-start gap-4">
                  <Lock className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-black mb-2">Güvenlik Önlemleri</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• SSL şifreleme teknolojisi</li>
                      <li>• Güvenli sunucu altyapısı</li>
                      <li>• Düzenli güvenlik güncellemeleri</li>
                      <li>• Yetkisiz erişim önleme sistemleri</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Third Party Sharing */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Share2 className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Üçüncü Taraflarla Paylaşım
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Kişisel bilgileriniz;
              </p>
              <div className="space-y-3">
                {[
                  'Kargo firmaları',
                  'Ödeme hizmeti sağlayıcıları',
                  'Yetkili kamu kurum ve kuruluşları'
                ].map((party, index) => (
                  <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{party}</span>
                  </div>
                ))}
              </div>
              <p className="pt-2">
                haricinde üçüncü kişilerle paylaşılmaz. Paylaşımlar, yalnızca hizmetin sağlanması amacıyla ve mevzuata uygun şekilde gerçekleştirilir.
              </p>
            </div>
          </div>
        </section>

        {/* Cookies */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 md:p-12 border border-orange-100">
            <div className="flex items-center gap-3 mb-6">
              <Cookie className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Çerezler (Cookies)
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Web sitemizde kullanıcı deneyimini geliştirmek amacıyla çerezler kullanılmaktadır. Çerezlerin kullanımı ve yönetimi ile ilgili detaylı bilgiye <Link href="/cerez-politikasi" className="text-blue-600 hover:underline font-semibold">Çerez Politikası</Link> sayfamızdan ulaşabilirsiniz.
              </p>
            </div>
          </div>
        </section>

        {/* User Responsibilities */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Kullanıcı Sorumlulukları
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Kullanıcılar, web sitesi üzerinden paylaştıkları bilgilerin doğru ve güncel olmasından sorumludur. Hesap bilgileri ve şifrelerin gizliliğinin korunması kullanıcının sorumluluğundadır.
              </p>
              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200 mt-4">
                <div className="flex items-start gap-4">
                  <Shield className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-black mb-2">Önemli Hatırlatma</h3>
                    <p className="text-gray-700">
                      Şifrenizi kimseyle paylaşmayın ve düzenli olarak güncelleyin. Şüpheli bir aktivite fark ederseniz derhal bizimle iletişime geçin.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Updates */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Güncellemeler
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Bu Gizlilik Politikası, mevzuat ve şirket politikaları doğrultusunda güncellenebilir. Yapılan değişiklikler web sitemizde yayımlandığı tarihten itibaren geçerli olur.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 md:p-12 border border-purple-100">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                İletişim
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Gizlilik politikamız ile ilgili her türlü soru ve talepleriniz için bizimle iletişime geçebilirsiniz:
              </p>
              <div className="bg-white rounded-xl p-6 border border-purple-200 mt-4">
                <a 
                  href="mailto:mervesaat@gmail.com" 
                  className="flex items-center gap-3 text-purple-600 hover:text-purple-700 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-semibold text-lg">mervesaat@gmail.com</span>
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

