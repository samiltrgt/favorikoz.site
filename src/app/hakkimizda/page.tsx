import Header from '@/components/header'
import Footer from '@/components/footer'
import { Sparkles, Target } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-4 tracking-tight">
              Hakkımızda
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Güzelliği bir rutin değil, bir deneyim olarak görüyoruz
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 pb-20">
        {/* Introduction */}
        <section className="mb-16">
          <div className="prose prose-lg max-w-none">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
              Favori Kozmetik, güzelliği bir rutin değil, bir deneyim olarak gören herkes için kurulmuş yenilikçi bir kozmetik markasıdır. Profesyonel kaliteyi ulaşılabilir hale getirme hedefiyle çıktığımız bu yolda; tırnak, bakım ve güzellik kategorilerinde trendleri yakından takip eden, güvenilir ve etkili ürünler sunuyoruz.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Misyonumuz
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Favori Kozmetik olarak misyonumuz; güzellik ve bakım alanında profesyonel kaliteye sahip ürünleri herkes için ulaşılabilir kılmak, kullanıcılarımızın beklentilerini aşan güvenilir ve yenilikçi çözümler sunmaktır. Ürün geliştirme ve seçim süreçlerimizde kalite, performans ve kullanıcı memnuniyetini ön planda tutarak; hem profesyonellerin hem de bireysel kullanıcıların ihtiyaçlarına gerçek çözümler üretmeyi amaçlıyoruz. Şeffaflık, süreklilik ve güven anlayışıyla güzellik sektöründe kalıcı değer yaratmak en temel hedefimizdir.
            </p>
          </div>
        </section>

        {/* Vision Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-8 md:p-12 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-light text-white">
                Vizyonumuz
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-200 leading-relaxed">
              Favori Kozmetik'in vizyonu; Türkiye'de ve global pazarda güzellik ve bakım kategorisinde güvenilen, tercih edilen ve ilham veren bir marka olmaktır. Trendleri takip eden değil, trendleri belirleyen bir marka anlayışıyla; yenilikçi ürünler, güçlü marka kimliği ve sürdürülebilir kalite yaklaşımıyla sektörde fark yaratmayı hedefliyoruz. Güzelliği herkes için erişilebilir, keyifli ve özgüven artıran bir deneyime dönüştürmek vizyonumuzun temelini oluşturur.
            </p>
          </div>
        </section>

        {/* Product Portfolio */}
        <section className="mb-16">
          <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-black" />
              <h2 className="text-2xl md:text-3xl font-light text-black">
                Ürün Portföyümüz
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Ürün portföyümüzü oluştururken hem profesyonellerin hem de bireysel kullanıcıların ihtiyaçlarını merkeze alıyoruz. Kalıcı oje, jel sistemleri, nail art ürünleri ve güzellik aksesuarlarında; kalite, performans ve estetiği bir araya getiren çözümler geliştiriyoruz. Her bir ürünümüz, kullanım kolaylığı ve yüksek memnuniyet sağlayacak şekilde titizlikle seçilmekte ve test edilmektedir.
            </p>
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="mb-16">
          <div className="prose prose-lg max-w-none">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
              Favori Kozmetik olarak sadece ürün satmıyor, aynı zamanda güzellik dünyasına ilham vermeyi amaçlıyoruz. Sürekli gelişen kozmetik sektöründe yenilikleri yakından takip ediyor, koleksiyonlarımızı bu doğrultuda güncelliyoruz. Amacımız; kendini iyi hissetmek isteyen herkesin favorisi olabilecek ürünleri, şeffaflık ve güven anlayışıyla sunmak.
            </p>
          </div>
        </section>

        {/* Closing Statement */}
        <section>
          <div className="text-center p-8 md:p-12 bg-black text-white rounded-2xl">
            <p className="text-xl md:text-2xl font-light leading-relaxed max-w-2xl mx-auto">
              Güzelliğin detaylarda gizli olduğuna inanıyor, bu detayları Favori Kozmetik kalitesiyle sizinle buluşturuyoruz.
            </p>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}

