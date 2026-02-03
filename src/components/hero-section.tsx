'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface HeroProduct {
  id: string
  name: string
  description: string
  image: string
  link: string
  slide_index: number
  slot_index: number
  is_active: boolean
}

const slides = [
  {
    id: 1,
    title: 'Günlük Rutininizi Yükseltin',
    subtitle: 'Salon kalitesinde hacim. Zahmetsiz rutin.',
    description: 'Modern güzellik için tasarlanmış premium saç bakım koleksiyonumuzu keşfedin.',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&h=900&fit=crop',
    cta: 'Ürünleri İncele',
    ctaLink: '/kategori/tirnak',
    secondaryCta: 'Tüm Ürünler',
    secondaryCtaLink: '/tum-urunler'
  },
  {
    id: 2,
    title: 'Saç Bakımında Yeni Dönem',
    subtitle: 'Minimal. Etkili. Zamansız.',
    description: 'Saç bakımı için sade ama güçlü formüller. Günlük rutininize şıklık katın.',
    image: 'https://images.unsplash.com/photo-1556228578-8b6b5be0b3ac?w=1600&h=900&fit=crop',
    cta: 'Ürünleri İncele',
    ctaLink: '/kategori/sac-bakimi',
    secondaryCta: 'Tüm Ürünler',
    secondaryCtaLink: '/tum-urunler'
  },
  {
    id: 3,
    title: 'İpek Kirpikte Zarif Dokunuş',
    subtitle: 'Doğal tonlar, güçlü etki.',
    description: 'Gün boyu kalıcı ve modern bir görünüm için seçilmiş ürünler.',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e6129138a?w=1600&h=900&fit=crop',
    cta: 'Ürünleri İncele',
    ctaLink: '/kategori/ipek-kirpik',
    secondaryCta: 'Tüm Ürünler',
    secondaryCtaLink: '/tum-urunler'
  }
]

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [heroProducts, setHeroProducts] = useState<Record<number, HeroProduct[]>>({})

  useEffect(() => {
    // Load hero products from database
    const loadHeroProducts = async () => {
      try {
        const response = await fetch('/api/hero-products', { 
          cache: 'no-store',
          next: { revalidate: 0 }
        })
        const result = await response.json()
        
        console.log('🔥 Hero Products API Response:', {
          success: result.success,
          dataLength: result.data?.length,
          data: result.data
        })
        
        if (result.success && result.data && Array.isArray(result.data)) {
          const grouped: Record<number, HeroProduct[]> = {}
          ;(result.data as HeroProduct[]).forEach((product) => {
            if (!product) return
            // Only filter by is_active if it's explicitly false
            if (product.is_active === false) return
            
            const slideIdx = product.slide_index ?? 0
            if (!grouped[slideIdx]) grouped[slideIdx] = []
            grouped[slideIdx].push(product)
          })
          
          Object.keys(grouped).forEach((key) => {
            grouped[Number(key)] = grouped[Number(key)].sort(
              (a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0)
            )
          })
          
          console.log('🔥 Grouped Hero Products:', grouped)
          setHeroProducts(grouped)
        } else {
          console.warn('⚠️ No hero products data or invalid format')
        }
      } catch (error) {
        console.error('❌ Error loading hero products:', error)
      }
    }
    loadHeroProducts()
    
    // Reload every 5 seconds to catch updates
    const interval = setInterval(loadHeroProducts, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-background to-secondary">
      {/* Background images with simple crossfade */}
      <div className="absolute inset-0 -z-10">
        {slides.map((s, i) => (
          <Image
            key={s.id}
            src={s.image}
            alt="hero-bg"
            fill
            priority={i === 0}
            sizes="100vw"
            className={`object-cover transition-opacity duration-700 ${i === currentSlide ? 'opacity-20' : 'opacity-0'}`}
          />
        ))}
      </div>

      {/* Decorative gradients */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-black/10 to-transparent blur-3xl hidden sm:block" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[36rem] h-[36rem] rounded-full bg-gradient-to-tr from-gray-300/40 to-transparent blur-3xl hidden sm:block" />

      {/* Content */}
      <div className="relative w-full flex items-start sm:items-center py-6 sm:py-12 md:py-20">
        <div className="container max-w-7xl w-full px-4 sm:px-6 lg:px-8">
          <div className="relative w-full">
            {(() => {
              const s = slides[currentSlide]
              return (
                <div key={currentSlide} className="w-full animate-fade-in-up">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-16 items-start lg:items-center">
                    {/* Text Content */}
                    <div className="text-black space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6 order-2 lg:order-1 w-full">
                      {/* Title */}
                      <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-light leading-[1.1] sm:leading-tight tracking-tight">{s.title}</h1>
                      {/* Subtitle */}
                      <h2 className="text-sm sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-light text-gray-600 max-w-lg leading-snug">{s.subtitle}</h2>
                      {/* Description */}
                      <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-600 max-w-xl leading-relaxed hidden sm:block">{s.description}</p>
                      {/* CTA Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 lg:gap-6 pt-3 sm:pt-3 md:pt-4 lg:pt-6 pb-4 sm:pb-0">
                        <Link
                          href={s.ctaLink}
                          className="inline-flex items-center justify-center w-full sm:w-auto px-5 sm:px-6 md:px-8 lg:px-12 py-3 sm:py-3 md:py-4 lg:py-5 bg-black hover:bg-gray-800 active:scale-95 text-white font-light text-sm sm:text-sm md:text-base lg:text-lg tracking-wide transition-all duration-300 rounded-full transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                          {s.cta}
                        </Link>
                        <Link
                          href={s.secondaryCtaLink}
                          className="inline-flex items-center justify-center w-full sm:w-auto px-5 sm:px-6 md:px-8 lg:px-12 py-3 sm:py-3 md:py-4 lg:py-5 bg-transparent hover:bg-white/50 active:scale-95 text-black font-light text-sm sm:text-sm md:text-base lg:text-lg tracking-wide transition-all duration-300 border border-black rounded-full transform hover:scale-105"
                        >
                          {s.secondaryCta}
                        </Link>
                      </div>
                    </div>

                    {/* Product Showcase */}
                    <div className="relative order-1 lg:order-2 w-full">
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                        {heroProducts[currentSlide] && heroProducts[currentSlide].length > 0 ? (
                          heroProducts[currentSlide].slice(0, 2).map((product, index) => (
                            <Link
                              key={product.id ?? `${product.slide_index}-${product.slot_index}`}
                              href={product.link || '#'}
                              className="block active:scale-95 transition-all duration-500 transform hover:-translate-y-2 animate-float"
                              style={{ animationDelay: `${(index + 1) * 200}ms` }}
                            >
                              <div className="aspect-square rounded-lg sm:rounded-xl md:rounded-2xl mb-2 sm:mb-3 md:mb-4 lg:mb-6 overflow-hidden relative">
                                {product.image ? (
                                  <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 40vw, 400px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                                    <div className="w-8 sm:w-12 md:w-16 lg:w-20 h-8 sm:h-12 md:h-16 lg:h-20 bg-orange-300 rounded-full animate-pulse-slow"></div>
                                  </div>
                                )}
                              </div>
                              <h3 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-light mb-1 sm:mb-2 line-clamp-2">{product.name}</h3>
                              <p className="text-gray-600 text-[10px] sm:text-xs md:text-sm mb-2 sm:mb-3 md:mb-4 line-clamp-2 hidden sm:block">{product.description}</p>
                              <span className="text-[10px] sm:text-xs md:text-sm font-light text-pink-600 hover:text-pink-700 active:scale-95 flex items-center gap-1 sm:gap-2 transition-all duration-200">
                                Şimdi Al <span className="transform transition-transform group-hover:translate-x-1">→</span>
                              </span>
                            </Link>
                          ))
                        ) : (
                          // Fallback: Default products if no data
                          <>
                            <div className="block active:scale-95 transition-all duration-500 transform hover:-translate-y-2 animate-float animation-delay-300">
                              <div className="aspect-square rounded-lg sm:rounded-xl md:rounded-2xl mb-2 sm:mb-3 md:mb-4 lg:mb-6 flex items-center justify-center overflow-hidden relative">
                                <div className="w-8 sm:w-12 md:w-16 lg:w-20 h-8 sm:h-12 md:h-16 lg:h-20 bg-orange-300 rounded-full animate-pulse-slow"></div>
                              </div>
                              <h3 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-light mb-1 sm:mb-2 line-clamp-2">Saç Fiberi</h3>
                              <p className="text-gray-600 text-[10px] sm:text-xs md:text-sm mb-2 sm:mb-3 md:mb-4 line-clamp-2 hidden sm:block">Doğal hacim ve kaplama</p>
                              <button className="text-[10px] sm:text-xs md:text-sm font-light text-pink-600 hover:text-pink-700 active:scale-95 flex items-center gap-1 sm:gap-2 transition-all duration-200">
                                Şimdi Al <span className="transform transition-transform group-hover:translate-x-1">→</span>
                              </button>
                            </div>
                            <div className="block active:scale-95 transition-all duration-500 transform hover:-translate-y-2 sm:mt-8 animate-float animation-delay-500">
                              <div className="aspect-square rounded-lg sm:rounded-xl md:rounded-2xl mb-2 sm:mb-3 md:mb-4 lg:mb-6 flex items-center justify-center overflow-hidden relative">
                                <div className="w-8 sm:w-12 md:w-16 lg:w-20 h-8 sm:h-12 md:h-16 lg:h-20 bg-pink-300 rounded-full animate-pulse-slow"></div>
                              </div>
                              <h3 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-light mb-1 sm:mb-2 line-clamp-2">Şekillendirme Pudrası</h3>
                              <p className="text-gray-600 text-[10px] sm:text-xs md:text-sm mb-2 sm:mb-3 md:mb-4 line-clamp-2 hidden sm:block">Mat bitim ve güçlü tutuş</p>
                              <button className="text-[10px] sm:text-xs md:text-sm font-light text-pink-600 hover:text-pink-700 active:scale-95 flex items-center gap-1 sm:gap-2 transition-all duration-200">
                                Şimdi Al <span className="transform transition-transform group-hover:translate-x-1">→</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
      {/* Slider controls - Hidden on mobile */}
      {slides.length > 1 && (
        <>
          <button
            aria-label="Önceki"
            onClick={prevSlide}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            aria-label="Sonraki"
            onClick={nextSlide}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots - Hidden on mobile */}
          <div className="hidden sm:flex absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 items-center gap-2 z-10">
            {slides.map((s, i) => (
              <button
                key={s.id}
                aria-label={`Slide ${i+1}`}
                onClick={() => goToSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide ? 'bg-black w-6' : 'bg-black/40 hover:bg-black/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
