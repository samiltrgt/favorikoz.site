'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSpriteScroll } from '@/hooks/useSpriteScroll'
import { FRAME_CONFIG } from '@/lib/animation/scrollConfig'

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLImageElement>(null)

  const prefersReducedMotion = useReducedMotion()

  useSpriteScroll({
    sectionRef,
    pinRef,
    canvasRef,
    overlayRef,
    posterRef,
    enabled: !prefersReducedMotion,
  })

  return (
    <section ref={sectionRef} className="relative w-full">
      <div
        ref={pinRef}
        className="relative h-[100dvh] w-full overflow-hidden bg-black md:h-[100vh]"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full"
          aria-hidden="true"
        />

        <img
          ref={posterRef}
          src={FRAME_CONFIG.posterSrc}
          alt="Lüks jel oje sahnesi"
          fetchPriority="high"
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out"
        />

        {/* Hero'nun alt kenarını sitenin gri tonuna (#AEAFAF) eriterek keskin geçişi yumuşatır */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 bg-gradient-to-b from-transparent to-[#AEAFAF] sm:h-40"
          aria-hidden="true"
        />

        <div
          ref={overlayRef}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white will-change-transform"
        >
          <h1 className="max-w-3xl text-3xl font-light leading-tight tracking-tight drop-shadow-sm sm:text-5xl md:text-6xl lg:text-7xl">
            Saf Parlaklık, Kusursuz Dokunuş
          </h1>
          <p className="mt-4 max-w-xl text-sm font-light text-white/80 sm:text-lg md:text-xl">
            Profesyonel kalıcılık ve ayna gibi parlaklık sunan lüks jel oje koleksiyonu.
          </p>
          <Link
            href="/tum-urunler"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-medium text-black transition-transform duration-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Koleksiyonu Keşfet
          </Link>
        </div>
      </div>
    </section>
  )
}
