import Header from '@/components/header'
import Footer from '@/components/footer'
import { Shield, FileText, Eye, Lock, Mail, Building, Database, Users, Share2, Clock, CheckCircle } from 'lucide-react'

export default function KVKKPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-4 tracking-tight">
              KVKK Aydınlatma Metni
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Kişisel Verilerin Korunması Kanunu kapsamında bilgilendirme
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 pb-20">
        {/* Introduction */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 md:p-12 border border-blue-100">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Genel Bilgilendirme
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, <strong className="text-black">Favori Kozmetik</strong> ("Veri Sorumlusu") olarak, kişisel verilerinizin güvenliğine büyük önem veriyoruz. Bu metin, kişisel verilerinizin hangi amaçlarla işlendiği, kimlerle paylaşıldığı ve haklarınız hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.
            </p>
          </div>
        </section>

        {/* Data Controller */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Building className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                1. Veri Sorumlusu
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700">
              <p>KVKK kapsamında kişisel verileriniz,</p>
              <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-black min-w-[120px]">Veri Sorumlusu:</span>
                  <span>Favori Kozmetik</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-black min-w-[120px]">Adres:</span>
                  <span>Tahtakale Mahallesi, Tahtakale Caddesi Çavuşoğlu Han No:24/4<br />Fatih/İstanbul/Türkiye</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-black min-w-[120px]">E-posta:</span>
                  <a href="mailto:mervesaat@gmail.com" className="text-blue-600 hover:underline">mervesaat@gmail.com</a>
                </div>
              </div>
              <p className="pt-2">tarafından işlenmektedir.</p>
            </div>
          </div>
        </section>

        {/* Processed Personal Data */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                2. İşlenen Kişisel Veriler
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 mb-6">
              Aşağıda belirtilen kişisel verileriniz işlenebilmektedir:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">Kimlik Bilgileri</span>
                </div>
                <p className="text-sm text-gray-600">Ad, soyad</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">İletişim Bilgileri</span>
                </div>
                <p className="text-sm text-gray-600">Telefon numarası, e-posta adresi</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">Teslimat ve Fatura</span>
                </div>
                <p className="text-sm text-gray-600">Adres bilgileri</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">Sipariş ve Ödeme</span>
                </div>
                <p className="text-sm text-gray-600">Sipariş ve ödeme bilgileri</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">Kullanıcı İşlem Bilgileri</span>
                </div>
                <p className="text-sm text-gray-600">Site kullanım bilgileri</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-black">Teknik Bilgiler</span>
                </div>
                <p className="text-sm text-gray-600">IP adresi ve site kullanım bilgileri</p>
              </div>
            </div>
          </div>
        </section>

        {/* Processing Purposes */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                3. Kişisel Verilerin İşlenme Amaçları
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 mb-6">
              Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
            </p>
            <div className="space-y-3">
              {[
                'Sipariş süreçlerinin yürütülmesi',
                'Ürün ve hizmetlerin sunulması',
                'Kargo ve teslimat işlemlerinin gerçekleştirilmesi',
                'Ödeme ve faturalama süreçlerinin yürütülmesi',
                'Müşteri destek ve iletişim faaliyetlerinin yürütülmesi',
                'Yasal yükümlülüklerin yerine getirilmesi',
                'Site güvenliğinin sağlanması'
              ].map((purpose, index) => (
                <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-4 border border-gray-200">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{purpose}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Data Transfer */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Share2 className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                4. Kişisel Verilerin Aktarılması
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 mb-6">
              Kişisel verileriniz, yukarıda belirtilen amaçlarla sınırlı olmak üzere;
            </p>
            <div className="space-y-3">
              {[
                'Kargo firmalarına',
                'Ödeme altyapısı sağlayıcılarına',
                'Yetkili kamu kurum ve kuruluşlarına'
              ].map((recipient, index) => (
                <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">{recipient}</span>
                </div>
              ))}
            </div>
            <p className="text-base md:text-lg text-gray-700 mt-6">
              KVKK'ya uygun şekilde aktarılabilir.
            </p>
          </div>
        </section>

        {/* Collection Method */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                5. Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi
              </h2>
            </div>
            <div className="space-y-6 text-base md:text-lg text-gray-700">
              <p>Kişisel verileriniz;</p>
              <div className="space-y-2">
                {[
                  'Web sitesi üzerinden',
                  'Sipariş ve iletişim formları aracılığıyla',
                  'Elektronik ortamda'
                ].map((method, index) => (
                  <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-4 border border-gray-200">
                    <div className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{method}</span>
                  </div>
                ))}
              </div>
              <p className="pt-2">KVKK'nın 5. maddesinde belirtilen;</p>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <ul className="space-y-2 list-disc list-inside">
                  <li>Bir sözleşmenin kurulması veya ifası,</li>
                  <li>Hukuki yükümlülüğün yerine getirilmesi,</li>
                  <li>Meşru menfaat</li>
                </ul>
                <p className="mt-4">hukuki sebeplerine dayanarak toplanmaktadır.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Storage Duration */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                6. Kişisel Verilerin Saklama Süresi
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Kişisel verileriniz, ilgili mevzuatta öngörülen süreler boyunca veya işleme amacının gerektirdiği süre kadar saklanmakta; sürenin sona ermesi halinde silinmekte, yok edilmekte veya anonim hale getirilmektedir.
            </p>
          </div>
        </section>

        {/* Rights */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 md:p-12 border border-blue-200">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                7. KVKK Kapsamındaki Haklarınız
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 mb-6">
              KVKK'nın 11. maddesi uyarınca;
            </p>
            <div className="space-y-3">
              {[
                'Kişisel verilerinizin işlenip işlenmediğini öğrenme',
                'İşlenmişse buna ilişkin bilgi talep etme',
                'İşleme amacını öğrenme',
                'Yanlış veya eksik işlenmişse düzeltilmesini isteme',
                'Silinmesini veya yok edilmesini talep etme',
                'Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme'
              ].map((right, index) => (
                <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-4 border border-gray-200">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{right}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-base md:text-lg text-gray-700">
                Bu haklarınıza ilişkin taleplerinizi, <a href="mailto:mervesaat@gmail.com" className="text-blue-600 hover:underline font-semibold">mervesaat@gmail.com</a> adresi üzerinden yazılı olarak iletebilirsiniz.
              </p>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}

