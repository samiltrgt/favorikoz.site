'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const HomeProductsBryhel = dynamic(() => import('@/components/home-products-bryhel'), {
  ssr: false,
})

interface DeferredHomeProductsBryhelProps {
  products: any[]
  title?: string
  viewAllLink?: string
  viewAllText?: string
}

export default function DeferredHomeProductsBryhel({
  products,
  title,
  viewAllLink,
  viewAllText,
}: DeferredHomeProductsBryhelProps) {
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
        <HomeProductsBryhel
          products={products}
          title={title}
          viewAllLink={viewAllLink}
          viewAllText={viewAllText}
        />
      ) : (
        <div className="h-16" aria-hidden />
      )}
    </div>
  )
}
