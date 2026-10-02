import Link from 'next/link'

export default function ShadeGuideSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-brand-surface to-brand-paper">
      <div className="container max-w-7xl">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-light text-brand-ink mb-6 tracking-tight">
            Tonunuzu Nasıl Seçersiniz
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Basit üç adımlı rehberimizle en doğal görünümlü sonuçları elde edin
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20">
          <div className="text-center">
            <div className="w-32 h-32 bg-brand-mist rounded-full flex items-center justify-center mx-auto mb-8">
              <div className="w-16 h-16 bg-brand-bloom rounded-full flex items-center justify-center">
                <span className="text-2xl font-light text-brand-ink">01</span>
              </div>
            </div>
            <h3 className="text-3xl font-light text-brand-ink mb-4 tracking-wide">
              Saçınızı Değerlendirin
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Mükemmel uyum için saç renginizi ve yoğunluk seviyenizi belirleyin
            </p>
          </div>

          <div className="text-center">
            <div className="w-32 h-32 bg-brand-bloom rounded-full flex items-center justify-center mx-auto mb-8">
              <div className="w-16 h-16 bg-brand-bloom-deep rounded-full flex items-center justify-center">
                <span className="text-2xl font-light text-brand-ink">02</span>
              </div>
            </div>
            <h3 className="text-3xl font-light text-brand-ink mb-4 tracking-wide">
              Tonunuzu Seçin
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Doğal görünümlü renk seçeneklerimizden birini tercih edin
            </p>
          </div>

          <div className="text-center">
            <div className="w-32 h-32 bg-accent rounded-full flex items-center justify-center mx-auto mb-8">
              <div className="w-16 h-16 bg-brand-rose/35 rounded-full flex items-center justify-center">
                <span className="text-2xl font-light text-brand-ink">03</span>
              </div>
            </div>
            <h3 className="text-3xl font-light text-brand-ink mb-4 tracking-wide">
              Uygulayın ve Şekillendirin
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Fiberleri seyrekleşen bölgelere serpin ve istediğiniz gibi şekillendirin
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/shade-guide"
            className="inline-flex items-center gap-3 px-12 py-5 bg-brand-rose hover:bg-brand-rose-deep text-white font-light text-lg tracking-wide transition-all duration-300 rounded-full"
          >
            Tam Renk Rehberini Görün →
          </Link>
        </div>
      </div>
    </section>
  )
}
