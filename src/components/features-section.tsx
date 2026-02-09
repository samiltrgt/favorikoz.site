export default function FeaturesSection() {
  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="container max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col items-center space-y-3 animate-fade-in-up animation-delay-200">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 animate-float">
              <span className="text-2xl">🚚</span>
            </div>
            <div>
              <h3 className="font-light text-black mb-1">Ücretsiz Kargo</h3>
              <p className="text-gray-500 text-sm">1500 TL ve üzeri siparişlerde</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3 animate-fade-in-up animation-delay-300">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 animate-float animation-delay-200">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <h3 className="font-light text-black mb-1">Dermatolojik Test</h3>
              <p className="text-gray-500 text-sm">Güvenli ve test edilmiş ürünler</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3 animate-fade-in-up animation-delay-400">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 animate-float animation-delay-400">
              <span className="text-2xl">↻</span>
            </div>
            <div>
              <h3 className="font-light text-black mb-1">14 Gün İade</h3>
              <p className="text-gray-500 text-sm">Koşulsuz iade garantisi</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3 animate-fade-in-up animation-delay-500">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 animate-float animation-delay-600">
              <span className="text-2xl">🔒</span>
            </div>
            <div>
              <h3 className="font-light text-black mb-1">Güvenli Ödeme</h3>
              <p className="text-gray-500 text-sm">iyzico ile güvenli ödeme</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
