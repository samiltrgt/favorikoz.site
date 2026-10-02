'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

declare global {
  interface Window {
    __lenis?: Lenis
  }
}

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// Low-power fallback: coarse pointers with few logical cores tend to be phones
// where JS-driven smooth-scroll can drop frames. We keep Lenis on by default
// (primary: mobile included) but bail out here when the device looks weak.
function isLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency ?? 8
  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  return coarsePointer && cores <= 4
}

/**
 * FAZ 1C — Lenis smooth-scroll driven from the single gsap.ticker clock.
 *
 * - One clock: gsap.ticker.add drives lenis.raf (no second rAF loop).
 * - lagSmoothing(0) so tab-blur catch-up frames don't jump the scroll.
 * - lenis.on('scroll', ScrollTrigger.update) keeps pinned sections in sync.
 * - Primary everywhere (mobile included); disabled on reduced-motion and
 *   low-power devices (fallback flag).
 * - window.__lenis is exposed for other modules / debugging.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches
    if (prefersReducedMotion || isLowPowerDevice()) return

    const lenis = new Lenis({
      smoothWheel: true,
      // Touch is left to native scrolling: Lenis' JS wheel smoothing is the win
      // on desktop; on touch it fights momentum. syncTouch stays off.
      syncTouch: false,
    })

    window.__lenis = lenis

    const update = (time: number) => {
      // gsap.ticker time is in seconds; lenis.raf expects milliseconds.
      lenis.raf(time * 1000)
    }

    const onScroll = () => ScrollTrigger.update()

    lenis.on('scroll', onScroll)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(update)
      lenis.off('scroll', onScroll)
      lenis.destroy()
      if (window.__lenis === lenis) delete window.__lenis
    }
  }, [])

  return <>{children}</>
}

export default SmoothScroll
