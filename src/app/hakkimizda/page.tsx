import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Sparkles, Target } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Hakkımızda | Favori Kozmetik',
  description: 'Favori Kozmetik hakkında bilgi. Güzelliği bir rutin değil, bir deneyim olarak görüyoruz. Tırnak, bakım ve güzellik kategorilerinde güvenilir ürünler.',
  alternates: { canonical: '/hakkimizda' },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-paper">
      <Header />

      <div className="bg-gradient-to-b from-brand-mist to-brand-paper pt-10 pb-16 md:pt-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="mb-4 text-12 font-ui uppercase tracking-[0.18em] text-brand-rose-deep">
              Favori Kozmetik
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-brand-ink mb-4 tracking-tight">
              Hakkımızda
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Güzelliği bir rutin değil, bir deneyim olarak görüyoruz
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 pb-20">
        <section className="mb-16">
          <p className="text-lg md:text-xl text-brand-ink/80 leading-relaxed">
            Favori Kozmetik, güzelliği bir rutin değil, bir deneyim olarak gören herkes için kurulmuş yenilikçi bir kozmetik markasıdır. Profesyonel kaliteyi ulaşılabilir hale getirme hedefiyle çıktığımız bu yolda; tırnak, bakım ve güzellik kategorilerinde trendleri yakından takip eden, güvenilir ve etkili ürünler sunuyoruz.
          </p>
        </section>

        <section className="mb-16">
          <div className="rounded-2xl border border-[var(--color-border-hex)] bg-brand-surface p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-brand-mist rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-brand-rose" />
              </div>
              <h2 className="text-2xl md:text-3xl font-light text-brand-ink">
                Misyonumuz
              </h2>
            </div>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Favori Kozmetik olarak misyonumuz; güzellik ve bakım alanında profesyonel kaliteye sahip ürünleri herkes için ulaşılabilir kılmak, kullanıcılarımızın beklentilerini aşan güvenilir ve yenilikçi çözümler sunmaktır. Ürün geliştirme ve seçim süreçlerimizde kalite, performans ve kullanıcı memnuniyetini ön planda tutarak; hem profesyonellerin hem de bireysel kullanıcıların ihtiyaçlarına gerçek çözümler üretmeyi amaçlıyoruz. Şeffaflık, süreklilik ve güven anlayışıyla güzellik sektöründe kalıcı değer yaratmak en temel hedefimizdir.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <div className="rounded-2xl bg-gradient-to-br from-brand-rose-deep to-brand-ink p-8 md:p-12 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/15 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-brand-bloom" />
              </div>
              <h2 className="text-2xl md:text-3xl font-light text-white">
                Vizyonumuz
              </h2>
            </div>
            <p className="text-base md:text-lg text-brand-bloom leading-relaxed">
              Favori Kozmetik&apos;in vizyonu; Türkiye&apos;de ve global pazarda güzellik ve bakım kategorisinde güvenilen, tercih edilen ve ilham veren bir marka olmaktır. Trendleri takip eden değil, trendleri belirleyen bir marka anlayışıyla; yenilikçi ürünler, güçlü marka kimliği ve sürdürülebilir kalite yaklaşımıyla sektörde fark yaratmayı hedefliyoruz. Güzelliği herkes için erişilebilir, keyifli ve özgüven artıran bir deneyime dönüştürmek vizyonumuzun temelini oluşturur.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <div className="rounded-2xl bg-brand-mist p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-brand-bloom rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-brand-rose-deep" />
              </div>
              <h2 className="text-2xl md:text-3xl font-light text-brand-ink">
                Ürün Portföyümüz
              </h2>
            </div>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Ürün portföyümüzü oluştururken hem profesyonellerin hem de bireysel kullanıcıların ihtiyaçlarını merkeze alıyoruz. Kalıcı oje, jel sistemleri, nail art ürünleri ve güzellik aksesuarlarında; kalite, performans ve estetiği bir araya getiren çözümler geliştiriyoruz. Her bir ürünümüz, kullanım kolaylığı ve yüksek memnuniyet sağlayacak şekilde titizlikle seçilmekte ve test edilmektedir.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <p className="text-lg md:text-xl text-brand-ink/80 leading-relaxed">
            Favori Kozmetik olarak sadece ürün satmıyor, aynı zamanda güzellik dünyasına ilham vermeyi amaçlıyoruz. Sürekli gelişen kozmetik sektöründe yenilikleri yakından takip ediyor, koleksiyonlarımızı bu doğrultuda güncelliyoruz. Amacımız; kendini iyi hissetmek isteyen herkesin favorisi olabilecek ürünleri, şeffaflık ve güven anlayışıyla sunmak.
          </p>
        </section>

        <section>
          <div className="text-center p-8 md:p-12 bg-brand-rose text-white rounded-2xl">
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
