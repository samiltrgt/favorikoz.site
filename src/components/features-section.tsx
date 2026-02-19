export default function FeaturesSection() {
  return (
    <section className="py-8 sm:py-10 bg-white border-t border-gray-100">
      <div className="container max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
          <div className="flex flex-col items-center space-y-2 animate-fade-in-up animation-delay-200">
            <div className="w-11 h-11 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-300">
              <span className="text-lg">🚚</span>
            </div>
            <div>
              <h3 className="font-light text-black text-sm mb-0.5">Ücretsiz Kargo</h3>
              <p className="text-gray-500 text-xs">1500 TL ve üzeri siparişlerde</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2 animate-fade-in-up animation-delay-300">
            <div className="w-11 h-11 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-300 animation-delay-200">
              <span className="text-lg">✓</span>
            </div>
            <div>
              <h3 className="font-light text-black text-sm mb-0.5">Dermatolojik Test</h3>
              <p className="text-gray-500 text-xs">Güvenli ve test edilmiş ürünler</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2 animate-fade-in-up animation-delay-400">
            <div className="w-11 h-11 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-300 animation-delay-400">
              <span className="text-lg">↻</span>
            </div>
            <div>
              <h3 className="font-light text-black text-sm mb-0.5">14 Gün İade</h3>
              <p className="text-gray-500 text-xs">Koşulsuz iade garantisi</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2 animate-fade-in-up animation-delay-500">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-300 animation-delay-600">
              <span className="text-lg">🔒</span>
            </div>
            <div>
              <h3 className="font-light text-black text-sm mb-0.5">Güvenli Ödeme</h3>
              <p className="text-gray-500 text-xs">iyzico ile güvenli ödeme</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
