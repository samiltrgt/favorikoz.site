'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import ProductCardModern from './product-card-modern'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductsCarouselProps {
  products: any[]
  title?: string
  viewAllLink?: string
}

export default function ProductsCarousel({
  products,
  title = 'ÜRÜNLER',
  viewAllLink = '/tum-urunler',
}: ProductsCarouselProps) {
  const [managedProducts, setManagedProducts] = useState<any[] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loadManaged = async () => {
      try {
        const res = await fetch('/api/home-carousel-products', { cache: 'no-store' })
        const json = await res.json()
        if (cancelled) return
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = (json.data as any[]).map((row) => row.products).filter(Boolean)
          setManagedProducts(mapped)
          return
        }
      } catch {}
      if (!cancelled) setManagedProducts([])
    }
    loadManaged()
    return () => {
      cancelled = true
    }
  }, [])

  const sourceProducts = managedProducts && managedProducts.length > 0 ? managedProducts : products
  const displayProducts = sourceProducts.slice(0, 20)

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const step = el.clientWidth * 0.85
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' })
  }

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      if (!scrollRef.current) return
      const e = scrollRef.current
      setCanScrollLeft(e.scrollLeft > 4)
      setCanScrollRight(e.scrollLeft < e.scrollWidth - e.clientWidth - 4)
    })
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows)
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      ro.disconnect()
    }
  }, [products])

  if (displayProducts.length === 0) return null

  return (
    <section className="relative py-12 sm:py-16 bg-white overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-56 pointer-events-none bg-gradient-to-b from-[#AEAFAF] to-white z-0"
        aria-hidden
      />

      <div className="container max-w-7xl relative z-10">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h2 className="text-2xl sm:text-3xl font-light text-black tracking-tight">
            {title}
          </h2>
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="hidden sm:flex items-center gap-2 text-sm font-light text-black hover:text-gray-600 transition-colors shrink-0"
            >
              Tümünü Gör
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full border border-gray-200 bg-white/95 text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Önceki ürünler"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full border border-gray-200 bg-white/95 text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Sonraki ürünler"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
          {displayProducts.map((product, index) => {
            if (!product?.id) return null
            return (
              <div
                key={product.id}
                className="flex-shrink-0 w-[72vw] sm:w-72 md:w-80 snap-start"
              >
                <ProductCardModern
                  product={product}
                  index={index}
                  showBrandBadge={false}
                />
              </div>
            )
          })}
          </div>
        </div>

        {viewAllLink && (
          <div className="sm:hidden text-center mt-6">
            <Link
              href={viewAllLink}
              className="inline-flex items-center gap-2 text-sm font-light text-black border-b border-black pb-1 hover:border-gray-400 transition-colors"
            >
              Tümünü Gör
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
