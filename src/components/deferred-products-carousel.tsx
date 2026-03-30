'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const ProductsCarousel = dynamic(() => import('@/components/products-carousel'), {
  ssr: false,
})

interface DeferredProductsCarouselProps {
  products: any[]
  title?: string
  viewAllLink?: string
}

export default function DeferredProductsCarousel({
  products,
  title,
  viewAllLink,
}: DeferredProductsCarouselProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (!sentinelRef.current || shouldRender) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [shouldRender])

  return (
    <div ref={sentinelRef}>
      {shouldRender ? (
        <ProductsCarousel products={products} title={title} viewAllLink={viewAllLink} />
      ) : (
        <div className="h-24" aria-hidden />
      )}
    </div>
  )
}
