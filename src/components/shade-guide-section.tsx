import Link from 'next/link'

export default function ShadeGuideSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-light text-black mb-6 tracking-tight">
            Tonunuzu Nasıl Seçersiniz
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Basit üç adımlı rehberimizle en doğal görünümlü sonuçları elde edin
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center mx-auto mb-8">
              <div className="w-16 h-16 bg-pink-300 rounded-full flex items-center justify-center">
                <span className="text-2xl font-light text-black">01</span>
              </div>
            </div>
            <h3 className="text-3xl font-light text-black mb-4 tracking-wide">
              Saçınızı Değerlendirin
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Mükemmel uyum için saç renginizi ve yoğunluk seviyenizi belirleyin
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-8">
              <div className="w-16 h-16 bg-orange-300 rounded-full flex items-center justify-center">
                <span className="text-2xl font-light text-black">02</span>
              </div>
            </div>
            <h3 className="text-3xl font-light text-black mb-4 tracking-wide">
              Tonunuzu Seçin
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Doğal görünümlü renk seçeneklerimizden birini tercih edin
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-8">
              <div className="w-16 h-16 bg-purple-300 rounded-full flex items-center justify-center">
                <span className="text-2xl font-light text-black">03</span>
              </div>
            </div>
            <h3 className="text-3xl font-light text-black mb-4 tracking-wide">
              Uygulayın ve Şekillendirin
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Fiberleri seyrekleşen bölgelere serpin ve istediğiniz gibi şekillendirin
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/shade-guide"
            className="inline-flex items-center gap-3 px-12 py-5 bg-black hover:bg-gray-800 text-white font-light text-lg tracking-wide transition-all duration-300 rounded-full"
          >
            Tam Renk Rehberini Görün →
          </Link>
        </div>
      </div>
    </section>
  )
}
