export default function FeaturesSection() {
  const items = [
    { title: 'Ücretsiz Kargo', description: '2000 TL ve üzeri siparişlerde', mark: '→' },
    { title: 'Dermatolojik Test', description: 'Güvenli ve test edilmiş ürünler', mark: '✓' },
    { title: '14 Gün İade', description: 'Koşulsuz iade garantisi', mark: '↻' },
    { title: 'Güvenli Ödeme', description: 'iyzico ile güvenli ödeme', mark: '◎' },
  ]

  return (
    <section className="py-8 sm:py-10 bg-brand-surface border-t border-border">
      <div className="container max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
          {items.map((item) => (
            <div key={item.title} className="flex flex-col items-center space-y-2">
              <div className="w-11 h-11 bg-brand-mist rounded-full flex items-center justify-center text-brand-rose">
                <span className="text-sm font-medium" aria-hidden>
                  {item.mark}
                </span>
              </div>
              <div>
                <h3 className="font-light text-brand-ink text-sm mb-0.5">{item.title}</h3>
                <p className="text-muted-foreground text-xs">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
