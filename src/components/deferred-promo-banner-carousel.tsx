'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const PromoBannerCarousel = dynamic(() => import('@/components/promo-banner-carousel'), {
  ssr: false,
})

export default function DeferredPromoBannerCarousel({ products = [] }: { products?: any[] }) {
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
      {shouldRender ? <PromoBannerCarousel products={products} /> : <div className="h-24" aria-hidden />}
    </div>
  )
}
