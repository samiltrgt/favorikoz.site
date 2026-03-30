'use client'

import { useEffect, useMemo, useState } from 'react'
import ScrollHero from '@/components/scroll-hero'

type ProductLike = { image?: string | null }

function isApplePlatform(ua: string): boolean {
  return /iPhone|iPad|iPod|Macintosh/i.test(ua)
}

export default function AdaptiveScrollHero({ products }: { products: ProductLike[] }) {
  const [isApple, setIsApple] = useState<boolean | null>(null)

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    setIsApple(isApplePlatform(ua))
  }, [])

  const fallbackImage = useMemo(
    () => products.find((p) => p?.image)?.image || '/logo.png',
    [products]
  )

  // Keep a stable shell during hydration to avoid layout shifts.
  if (isApple === null) {
    return <div className="relative w-full h-full min-h-[100vh] bg-black/30" aria-hidden />
  }

  if (!isApple) {
    return (
      <div className="relative w-full h-full min-h-[100vh] overflow-hidden bg-[#1e1b18]">
        <img
          src={fallbackImage || '/logo.png'}
          alt="Favori Kozmetik"
          className="absolute inset-0 w-full h-full object-cover opacity-45"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/35" />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <h1 className="text-2xl font-semibold text-center text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)]">
            Favori Kozmetik
          </h1>
        </div>
      </div>
    )
  }

  return <ScrollHero products={products} />
}

