'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ProductCardModern from './product-card-modern'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

interface PromoBannerData {
  id: string
  title: string
  description: string
  image: string
  image_mobile?: string | null
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

const PRODUCTS_PER_PAGE = 5
const MAX_PROMO_PRODUCTS = 5
const MOBILE_PRODUCTS_COUNT = 3
const MOBILE_BREAKPOINT = 768

/** Mobilde kullanılacak banner görselleri (sırayla: 1. Kirpik, 2. Saç, 3. Tırnak) */
const MOBILE_BANNER_FALLBACKS = [
  'https://bvbhkvngwvuiiuhuovid.supabase.co/storage/v1/object/public/images/banners/mobil-kirpik.jpg',
  'https://bvbhkvngwvuiiuhuovid.supabase.co/storage/v1/object/public/images/banners/mobil-sac.jpg',
  'https://bvbhkvngwvuiiuhuovid.supabase.co/storage/v1/object/public/images/banners/mobil-tirnak.jpg',
]

export default function PromoBannerCarousel({ products = [] }: { products?: any[] }) {
  const [banners, setBanners] = useState<PromoBannerData[]>([])
  const [managedProductsByBanner, setManagedProductsByBanner] = useState<Record<string, any[]>>({})
  const [current, setCurrent] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [carouselRes, legacyRes, managedRes] = await Promise.all([
          fetch('/api/promo-banners?position=carousel', { cache: 'no-store' }),
          fetch('/api/promo-banners', { cache: 'no-store' }),
          fetch('/api/promo-banner-products', { cache: 'no-store' }),
        ])

        const carouselJson = await carouselRes.json()
        const legacyJson = await legacyRes.json()
        const managedJson = await managedRes.json()

        if (managedJson.success && Array.isArray(managedJson.data)) {
          const grouped: Record<string, any[]> = {}
          ;(managedJson.data as any[]).forEach((row) => {
            if (!row.banner_id || !row.products) return
            if (!grouped[row.banner_id]) grouped[row.banner_id] = []
            grouped[row.banner_id].push(row.products)
          })
          setManagedProductsByBanner(grouped)
        }

        if (carouselJson.success && Array.isArray(carouselJson.data) && carouselJson.data.length > 0) {
          setBanners(carouselJson.data)
          setCurrent(0)
        } else if (legacyJson.success && Array.isArray(legacyJson.data) && legacyJson.data.length > 0) {
          // Geriye donuk uyumluluk: carousel kaydi yoksa mevcut aktif bannerlardan devam et
          setBanners(legacyJson.data)
          setCurrent(0)
        }
      } catch (e) {
        console.error('PromoBannerCarousel load error:', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const goTo = useCallback((index: number) => {
    setCurrent(Math.max(0, Math.min(index, banners.length - 1)))
  }, [banners.length])

  const getBannerLink = useCallback((b: PromoBannerData) => {
    const isTirnak =
      (b.image?.includes('bannertirnak') ?? false) || (b.title?.toUpperCase() === 'TIRNAK ÜRÜNLERİMİZ')
    return isTirnak ? '/kategori/tirnak' : (b.link?.trim() || '')
  }, [])

  const getProductsForBanner = useCallback(
    (b: PromoBannerData) => {
      const managed = managedProductsByBanner[b.id]
      if (managed && managed.length > 0) return managed.slice(0, MAX_PROMO_PRODUCTS)
      const link = getBannerLink(b)
      const slug = getCategorySlugFromLink(link) || (b.image?.includes('bannertirnak') || b.title?.toUpperCase() === 'TIRNAK ÜRÜNLERİMİZ' ? 'tirnak' : null)
      const list = slug ? products.filter((p: any) => p.category_slug === slug) : products
      return (list.length > 0 ? list : products).slice(0, MAX_PROMO_PRODUCTS)
    },
    [products, getBannerLink, managedProductsByBanner]
  )

  const productsByBanner = useMemo(
    () => banners.map((b) => getProductsForBanner(b)),
    [banners, getProductsForBanner]
  )

  if (isLoading || banners.length === 0) return null

  const totalBanners = banners.length
  const slidePercent = totalBanners > 0 ? 100 / totalBanners : 100

  const canGoPrev = current > 0
  const canGoNext = current < totalBanners - 1
  const goPrev = () => setCurrent((c) => Math.max(0, c - 1))
  const goNext = () => setCurrent((c) => Math.min(totalBanners - 1, c + 1))

  return (
    <section className="relative w-full min-w-full bg-white border-t border-gray-100 overflow-x-hidden overflow-y-visible">
      <div className="relative w-full bg-white">
        {/* Banner alanı - kayarak geçiş */}
        <div className="relative w-full overflow-hidden min-h-[180px] md:min-h-[200px] lg:min-h-0 lg:[aspect-ratio:1910/250] bg-white">
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{
              width: `${totalBanners * 100}%`,
              transform: `translateX(-${current * slidePercent}%)`,
            }}
          >
            {banners.map((b, i) => {
              const link = getBannerLink(b)
              const mobileImage =
                (b as PromoBannerData).image_mobile ||
                MOBILE_BANNER_FALLBACKS[i] ||
                b.image
              const slideContent = (
                <div className="relative block w-full h-full min-h-[180px] md:min-h-[200px] lg:min-h-0 lg:[aspect-ratio:1910/250] bg-white">
                  {mobileImage && (
                    <Image
                      src={mobileImage}
                      alt={b.title || 'Promo banner'}
                      fill
                      className="object-cover object-center md:hidden"
                      sizes="100vw"
                      priority={i === 0}
                    />
                  )}
                  {b.image && (
                    <Image
                      src={b.image}
                      alt={b.title || 'Promo banner'}
                      fill
                      className="object-cover object-center hidden md:block"
                      sizes="100vw"
                      priority={i === 0}
                    />
                  )}
                </div>
              )
              return link ? (
                <Link
                  key={b.id || i}
                  href={link}
                  className="block shrink-0 h-full group cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ width: `${slidePercent}%`, flexBasis: `${slidePercent}%` }}
                  aria-label={b.title}
                >
                  {slideContent}
                </Link>
              ) : (
                <div key={b.id || i} className="shrink-0 h-full" style={{ width: `${slidePercent}%`, flexBasis: `${slidePercent}%` }}>
                  {slideContent}
                </div>
              )
            })}
          </div>
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex gap-2 z-10">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === current ? 'bg-black' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Banner ${i + 1}`}
                />
              ))}
            </div>
          )}
          {/* Banner altı: #D9C9BA geçiş (banner ile ürünler tek parça gibi) */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24 sm:h-28 pointer-events-none z-[1]"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(217, 201, 186, 0.4) 50%, #D9C9BA 100%)',
            }}
            aria-hidden
          />
        </div>

        {/* Banner ile ürünler arası: ok butonları - #D9C9BA ile bütün */}
        <div
          className="relative flex items-center justify-between px-4 sm:px-6 py-3 min-h-[56px] transition-colors duration-500 ease-out"
          style={{
            background: 'linear-gradient(to bottom, #D9C9BA 0%, #D9C9BA 100%)',
          }}
        >
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            className="p-2.5 rounded-full border border-gray-200 bg-white/95 text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Önceki"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="p-2.5 rounded-full border border-gray-200 bg-white/95 text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Sonraki"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 3 sayfa = 3 banner: Sayfa 1 Tırnak, 2 Saç Bakımı, 3 İpek Kirpik */}
        <PromoCategoryProductsByBanner
          productsByBanner={productsByBanner}
          currentPage={current}
        />
      </div>
    </section>
  )
}

// 3 banner = 3 sayfa. Mobilde 3 ürün, masaüstünde 5 ürün.
function PromoCategoryProductsByBanner({
  productsByBanner,
  currentPage,
}: {
  productsByBanner: any[][]
  currentPage: number
}) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const totalPages = Math.max(1, productsByBanner.length)
  const page = Math.min(Math.max(0, currentPage), totalPages - 1)
  const gridCols = isMobile ? 'grid-cols-3' : 'grid-cols-5'

  return (
    <div
      className="relative w-full pt-0 pb-12 sm:pb-16 overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #D9C9BA 0%, #D9C9BA 20%, white 70%, white 100%)',
      }}
    >
      <div className="w-full relative z-10">
        <div className="relative w-full overflow-hidden px-4 sm:px-6">
          <div className="overflow-hidden w-full">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                width: `${totalPages * 100}%`,
                transform: `translateX(-${page * (100 / totalPages)}%)`,
              }}
            >
              {productsByBanner.map((pageProducts, pageIndex) => {
                const displayProducts = isMobile ? pageProducts.slice(0, MOBILE_PRODUCTS_COUNT) : pageProducts
                return (
                <div
                  key={pageIndex}
                  className={`grid ${gridCols} gap-3 sm:gap-4 shrink-0`}
                  style={{ flexBasis: `${100 / totalPages}%`, width: `${100 / totalPages}%` }}
                >
                  {displayProducts.map((product, index) => {
                    if (!product?.id) return <div key={index} />
                    return (
                      <div key={product.id} className="min-w-0">
                        <ProductCardModern
                          product={product}
                          index={pageIndex * MAX_PROMO_PRODUCTS + index}
                          showBrandBadge={false}
                          compact
                        />
                      </div>
                    )
                  })}
                </div>
              )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
