'use client'

import { useEffect, useMemo, useState } from 'react'
import ScrollHero from '@/components/scroll-hero'

type ProductLike = { image?: string | null }

function isAndroidPlatform(ua: string): boolean {
  return /Android/i.test(ua)
}

export default function AdaptiveScrollHero({ products }: { products: ProductLike[] }) {
  const [isAndroid, setIsAndroid] = useState<boolean | null>(null)
  const [androidPanX, setAndroidPanX] = useState(0)

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    setIsAndroid(isAndroidPlatform(ua))
  }, [])

  useEffect(() => {
    if (!isAndroid) return

    const SCROLL_RANGE_VH = 2.9
    let rafId = 0
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const rangePx = window.innerHeight * SCROLL_RANGE_VH
        const progress = Math.min(Math.max(window.scrollY / rangePx, 0), 1)
        setAndroidPanX(progress)
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
    }
  }, [isAndroid])

  const fallbackImage = useMemo(
    () => products.find((p) => p?.image)?.image || '/logo.png',
    [products]
  )
  const androidHeroImage = useMemo(
    () => '/benfv.png?v=2',
    [],
  )

  // Keep a stable shell during hydration to avoid layout shifts.
  if (isAndroid === null) {
    return <div className="relative w-full h-full min-h-[100vh] bg-black/30" aria-hidden />
  }

  if (isAndroid) {
    return (
      <div className="relative w-full h-full min-h-[100vh] overflow-hidden bg-[#1e1b18]">
        <img
          src={androidHeroImage || fallbackImage || '/logo.png'}
          alt="Favori Kozmetik"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: `${androidPanX * 100}% center` }}
          loading="eager"
          decoding="async"
        />
      </div>
    )
  }

  return <ScrollHero products={products} />
}

