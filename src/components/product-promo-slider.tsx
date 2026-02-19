'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PromoBannerData {
  id: string
  title: string
  description: string
  image: string
  link: string
  button_text: string
  position: string
  is_active: boolean
  display_order: number
}

function getCategorySlugFromLink(link: string | undefined): string | null {
  if (!link || !link.trim()) return null
  const trimmed = link.trim()
  const match = trimmed.match(/\/kategori\/([^/?#]+)/)
  if (match) return match[1]
  if (trimmed.startsWith('/')) return trimmed.replace(/^\/+/, '').split('/')[0] || null
  return trimmed.split('/')[0] || null
}

const SLIDE_BG_COLORS = [
  'rgb(236, 245, 233)',   // soft green
  'rgb(247, 242, 233)',   // warm beige
  'rgb(243, 236, 245)',   // soft lavender
]

export default function ProductPromoSlider({ products = [] }: { products?: any[] }) {
  const [banners, setBanners] = useState<PromoBannerData[]>([])
  const [current, setCurrent] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/promo-banners', { cache: 'no-store' })
        const result = await res.json()
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          setBanners(result.data)
          setCurrent(0)
        }
      } catch (e) {
        console.error('ProductPromoSlider load error:', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const getBannerLink = useCallback((b: PromoBannerData) => {
    const isTirnak =
      (b.image?.includes('bannertirnak') ?? false) || (b.title?.toUpperCase() === 'TIRNAK ÜRÜNLERİMİZ')
    return isTirnak ? '/kategori/tirnak' : (b.link?.trim() || '')
  }, [])

  const slides = useMemo(() => {
    return banners.map((b, i) => {
      const link = getBannerLink(b)
      const slug = getCategorySlugFromLink(link) || (b.image?.includes('bannertirnak') || b.title?.toUpperCase() === 'TIRNAK ÜRÜNLERİMİZ' ? 'tirnak' : null)
      const list = slug ? products.filter((p: any) => p.category_slug === slug) : products
      const product = (list.length > 0 ? list : products)[0] || null
      return {
        banner: b,
        product,
        bgColor: SLIDE_BG_COLORS[i % SLIDE_BG_COLORS.length],
      }
    })
  }, [banners, products, getBannerLink])

  const goTo = useCallback((index: number) => {
    setCurrent(Math.max(0, Math.min(index, slides.length - 1)))
  }, [slides.length])

  if (isLoading || slides.length === 0) return null

  const total = slides.length
  const canGoPrev = current > 0
  const canGoNext = current < total - 1
  const goPrev = () => setCurrent((c) => Math.max(0, c - 1))
  const goNext = () => setCurrent((c) => Math.min(total - 1, c + 1))

  return (
    <section className="relative w-full bg-white border-t border-gray-100 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[320px] lg:min-h-[420px]">
        {/* Sol: Ürün slider (fade) */}
        <div className="relative flex items-center justify-center overflow-hidden order-2 lg:order-1" style={{ backgroundColor: slides[current]?.bgColor || '#f5f0e8' }}>
          <div className="relative w-full max-w-md px-6 py-8">
            {slides.map((slide, i) => (
              <div
                key={slide.banner.id}
                className={`absolute inset-0 flex items-center justify-center px-6 py-8 transition-opacity duration-300 ${
                  i === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {slide.product ? (
                  <Link
                    href={`/urun/${slide.product.slug}`}
                    className="block text-center group"
                  >
                    <div className="relative aspect-square w-40 h-40 mx-auto mb-6 overflow-hidden rounded-2xl bg-white/80">
                      <Image
                        src={slide.product.image}
                        alt={slide.product.name}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform"
                        sizes="200px"
                      />
                    </div>
                    <h3 className="font-medium text-gray-900 text-lg line-clamp-2 mb-2 mt-2 group-hover:underline">
                      {slide.product.name}
                    </h3>
                    <div className="text-xl font-bold text-gray-900">
                      ₺{slide.product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </Link>
                ) : (
                  <div className="text-center text-gray-500">
                    <p className="text-sm">Bu kategoride ürün bulunamadı.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sağ: Promo görsel + overlay başlık */}
        <div className="relative overflow-hidden order-1 lg:order-2 min-h-[240px] lg:min-h-full">
          {slides.map((slide, i) => (
            <div
              key={slide.banner.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                i === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {slide.banner.image && (
                <Image
                  src={slide.banner.image}
                  alt={slide.banner.title || ''}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              )}
              <div className="absolute inset-0 flex items-end justify-start p-6 lg:p-10 bg-gradient-to-t from-black/40 via-transparent to-transparent">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white drop-shadow-lg max-w-md">
                  {slide.banner.title || ''}
                </h2>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Oklar */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-2 lg:pl-4 z-20">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canGoPrev}
          className="p-2.5 rounded-full border border-gray-200 bg-white/95 text-gray-600 hover:bg-gray-50 shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Önceki"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 lg:pr-4 z-20">
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="p-2.5 rounded-full border border-gray-200 bg-white/95 text-gray-600 hover:bg-gray-50 shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Sonraki"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Pagination dots */}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? 'bg-gray-900' : 'bg-white/80 hover:bg-white'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
