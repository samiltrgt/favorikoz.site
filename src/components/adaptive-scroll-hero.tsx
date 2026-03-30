'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
    () => '/Gemini_Generated_Image_kactoikactoikact.png',
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
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          style={{ objectPosition: `${androidPanX * 100}% center` }}
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/55" />
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-white tracking-wide drop-shadow-[0_2px_20px_rgba(0,0,0,0.45)]">
              Favori Kozmetik
            </h1>
            <p className="mt-3 text-sm text-white/90">
              Profesyonel bakim urunleri
            </p>
            <Link
              href="/tum-urunler"
              className="mt-6 inline-flex items-center justify-center rounded-md bg-white/95 px-5 py-2.5 text-sm font-medium text-[hsl(24,15%,15%)] shadow-md"
            >
              Tum Urunleri Gor
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <ScrollHero products={products} />
}

