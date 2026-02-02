import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Truck, RefreshCw, Shield, Mail, Phone, Clock, Package, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kargo ve İade | Favori Kozmetik',
  description: 'Kargo süreleri, gönderim koşulları ve iade politikası. Siparişleriniz güvenli ve hızlı şekilde size ulaşır.',
  alternates: { canonical: '/kargo-iade' },
}

export default function ShippingReturnsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-4 tracking-tight">
              Kargo ve İade
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Siparişleriniz güvenli ve hızlı şekilde size ulaşır
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 pb-20">
        {/* Shipping Policy */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Kargo ve Teslimat Politikası
              </h2>
            </div>
            
            <div className="space-y-6 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Favori Kozmetik'ten verdiğiniz tüm siparişler, ödeme onayının ardından <strong className="text-black">1–3 iş günü</strong> içerisinde özenle hazırlanarak kargoya teslim edilir. Siparişleriniz, anlaşmalı kargo firmalarımız aracılığıyla güvenli şekilde adresinize ulaştırılır.
              </p>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-black mb-2">Kargo Süresi</h3>
                    <p className="text-gray-700">
                      Kargo süresi, teslimat adresine bağlı olarak değişiklik gösterebilir. Kampanya ve yoğunluk dönemlerinde kargoya teslim süresinde kısa süreli uzamalar yaşanabilir. Siparişiniz kargoya verildiğinde, kargo takip bilgileri tarafınıza iletilir.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-start gap-4">
                  <Shield className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-black mb-2">Önemli Not</h3>
                    <p className="text-gray-700">
                      Kargo firması kaynaklı gecikmelerden Favori Kozmetik sorumlu tutulamaz; ancak yaşanabilecek her türlü durumda destek ekibimiz size yardımcı olmaktan memnuniyet duyar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Returns Policy */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-8 md:p-12 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-light text-white">
                İade ve Değişim Politikası
              </h2>
            </div>
            
            <div className="space-y-6 text-base md:text-lg text-gray-200 leading-relaxed">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white mb-2">İade Süresi</h3>
                    <p className="text-gray-200">
                      Favori Kozmetik'ten satın aldığınız ürünleri, teslim tarihinden itibaren <strong className="text-white">14 gün</strong> içerisinde iade edebilirsiniz. İade edilecek ürünlerin kullanılmamış, ambalajının açılmamış, orijinal kutusu ve faturası ile birlikte gönderilmesi gerekmektedir.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/20">
                <div className="flex items-start gap-4">
                  <Package className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white mb-2">Önemli Uyarı</h3>
                    <p className="text-gray-200">
                      Hijyen ve sağlık koşulları gereği; açılmış, kullanılmış veya ambalajı zarar görmüş kozmetik ürünlerinde iade ve değişim kabul edilmemektedir.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start gap-4">
                  <Shield className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white mb-2">Hatalı veya Hasarlı Ürün</h3>
                    <p className="text-gray-200">
                      Ürünün hatalı, hasarlı veya yanlış gönderilmesi durumunda, kargo ücreti Favori Kozmetik tarafından karşılanır. Bu tür durumlarda bizimle en kısa sürede iletişime geçmenizi rica ederiz.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white mb-2">İade Ödemesi</h3>
                    <p className="text-gray-200">
                      İade onayı verilen ürünler tarafımıza ulaştıktan sonra, iade tutarı <strong className="text-white">7–14 iş günü</strong> içerisinde ödeme yapılan yönteme bağlı olarak tarafınıza geri ödenir.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl md:text-3xl font-light text-black">
                İletişim
              </h2>
            </div>
            
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                Kargo, iade ve değişim süreçleriyle ilgili her türlü soru ve talebiniz için bizimle iletişime geçebilirsiniz.
              </p>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200 mt-6">
                <p className="text-lg font-semibold text-black text-center">
                  Müşteri memnuniyeti, Favori Kozmetik için her zaman önceliklidir.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <a 
                  href="mailto:mervesaat@gmail.com" 
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">E-posta</p>
                    <p className="text-base font-medium text-black">mervesaat@gmail.com</p>
                  </div>
                </a>
                
                <a 
                  href="tel:05376470710" 
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefon</p>
                    <p className="text-base font-medium text-black">0537 647 07 10</p>
                  </div>
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

