import Header from '@/components/header'
import Footer from '@/components/footer'
import { FileText, Users, ShoppingBag, Shield, Copyright, AlertTriangle, Link as LinkIcon, RefreshCw, Scale, Mail, CheckCircle } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-700" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-4 tracking-tight">
              Kullanım Koşulları
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Web sitemizi kullanmadan önce lütfen bu koşulları okuyunuz
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 pb-20">
        {/* Introduction */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Genel Bilgilendirme
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Bu web sitesine erişim sağlayan ve siteyi kullanan tüm ziyaretçiler, aşağıda belirtilen kullanım koşullarını kabul etmiş sayılır. Favori Kozmetik, bu koşulları önceden haber vermeksizin değiştirme hakkını saklı tutar.
            </p>
          </div>
        </section>

        {/* Parties */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                1. Taraflar
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              İşbu Kullanım Koşulları, Favori Kozmetik ile web sitesini kullanan ziyaretçi ve kullanıcılar arasında geçerlidir.
            </p>
          </div>
        </section>

        {/* Service Scope */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingBag className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                2. Hizmetin Kapsamı
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Favori Kozmetik, web sitesi üzerinden kozmetik ve bakım ürünlerinin tanıtımını ve satışını gerçekleştirmektedir. Sunulan hizmetlerin kapsamı ve içeriği, gerekli görüldüğü takdirde değiştirilebilir.
            </p>
          </div>
        </section>

        {/* User Obligations */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 md:p-12 border border-blue-100">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                3. Kullanıcı Yükümlülükleri
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 mb-6">
              Kullanıcılar;
            </p>
            <div className="space-y-3">
              {[
                'Web sitesini yürürlükteki mevzuata uygun şekilde kullanmayı',
                'Site güvenliğini tehdit edecek herhangi bir faaliyette bulunmamayı',
                'Yanıltıcı, yanlış veya başkalarına ait bilgileri paylaşmamayı',
                'Site içeriğini izinsiz kopyalamamayı veya çoğaltmamayı'
              ].map((obligation, index) => (
                <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-4 border border-gray-200">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{obligation}</span>
                </div>
              ))}
            </div>
            <p className="text-base md:text-lg text-gray-700 mt-6">
              kabul eder.
            </p>
          </div>
        </section>

        {/* Membership and Orders */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingBag className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                4. Üyelik ve Siparişler
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Web sitemiz üzerinden üyelik oluşturulabilir veya üye olmadan alışveriş yapılabilir. Kullanıcılar, sipariş sırasında verdikleri bilgilerin doğru ve eksiksiz olduğunu kabul eder.
              </p>
              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200 mt-4">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">
                    Yanlış veya eksik bilgi verilmesinden doğabilecek sorunlardan Favori Kozmetik sorumlu değildir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Intellectual Property */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 md:p-12 border border-purple-100">
            <div className="flex items-center gap-3 mb-6">
              <Copyright className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                5. Fikri Mülkiyet Hakları
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Web sitesinde yer alan tüm içerikler (metinler, görseller, logolar, tasarımlar ve yazılımlar) Favori Kozmetik'e aittir veya lisanslı olarak kullanılmaktadır. İzinsiz kullanımı, kopyalanması veya dağıtılması yasaktır.
            </p>
          </div>
        </section>

        {/* Limitation of Liability */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                6. Sorumluluğun Sınırlandırılması
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Favori Kozmetik, web sitesinin kesintisiz veya hatasız çalışacağını taahhüt etmez. Site kullanımından kaynaklanan doğrudan veya dolaylı zararlardan, hukukun izin verdiği ölçüde sorumluluk kabul edilmez.
            </p>
          </div>
        </section>

        {/* Third Party Links */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <LinkIcon className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                7. Üçüncü Taraf Bağlantılar
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Web sitesi üzerinden üçüncü taraf web sitelerine yönlendirme yapılabilir. Bu sitelerin içeriklerinden ve gizlilik uygulamalarından Favori Kozmetik sorumlu değildir.
            </p>
          </div>
        </section>

        {/* Changes */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                8. Değişiklikler
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Favori Kozmetik, işbu Kullanım Koşulları'nı dilediği zaman güncelleme hakkını saklı tutar. Güncellenen koşullar, web sitesinde yayımlandığı tarihten itibaren geçerli olur.
            </p>
          </div>
        </section>

        {/* Applicable Law */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Scale className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                9. Uygulanacak Hukuk ve Yetkili Mahkeme
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              İşbu Kullanım Koşulları'nın uygulanmasında Türkiye Cumhuriyeti hukuku geçerlidir. Taraflar arasında doğabilecek uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                10. İletişim
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Kullanım Koşulları ile ilgili her türlü soru ve talepleriniz için bizimle iletişime geçebilirsiniz:
              </p>
              <div className="bg-white rounded-xl p-6 border border-gray-200 mt-4">
                <a 
                  href="mailto:mervesaat@gmail.com" 
                  className="flex items-center gap-3 text-gray-700 hover:text-black transition-colors"
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

