'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

const AdaptiveScrollHero = dynamic(() => import('@/components/adaptive-scroll-hero'), {
  ssr: false,
})

type ProductLike = { image?: string | null }

export default function DeferredAdaptiveScrollHero({ products }: { products: ProductLike[] }) {
  const [shouldHydrateHero, setShouldHydrateHero] = useState(false)

  const fallbackImage = useMemo(
    () => products.find((p) => p?.image)?.image || '/logo.png',
    [products],
  )

  useEffect(() => {
    if (shouldHydrateHero) return

    const activate = () => setShouldHydrateHero(true)

    window.addEventListener('wheel', activate, { once: true, passive: true })
    window.addEventListener('touchstart', activate, { once: true, passive: true })
    window.addEventListener('pointerdown', activate, { once: true, passive: true })
    window.addEventListener('keydown', activate, { once: true })

    return () => {
      window.removeEventListener('wheel', activate)
      window.removeEventListener('touchstart', activate)
      window.removeEventListener('pointerdown', activate)
      window.removeEventListener('keydown', activate)
    }
  }, [shouldHydrateHero])

  if (shouldHydrateHero) {
    return <AdaptiveScrollHero products={products} />
  }

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
