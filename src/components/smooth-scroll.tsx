'use client'

import { useEffect } from 'react'
import type Lenis from 'lenis'

declare global {
  interface Window {
    __lenis?: Lenis
  }
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Native scrolling is available immediately. Desktop wheel smoothing starts
 * after load; touch devices keep native momentum without animation libraries.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches
    if (prefersReducedMotion || window.matchMedia('(pointer: coarse)').matches) return
    let cancelled = false
    let timer: number | undefined
    let dispose: (() => void) | undefined
    const start = () => {
      timer = window.setTimeout(() => {
        void Promise.all([import('lenis'), import('gsap'), import('gsap/ScrollTrigger')])
          .then(([{ default: Lenis }, { gsap }, { ScrollTrigger }]) => {
            if (cancelled) return
            gsap.registerPlugin(ScrollTrigger)
            const lenis = new Lenis({ smoothWheel: true, syncTouch: false })
            window.__lenis = lenis
            const update = (time: number) => lenis.raf(time * 1000)
            const onScroll = () => ScrollTrigger.update()
            lenis.on('scroll', onScroll)
            gsap.ticker.add(update)
            gsap.ticker.lagSmoothing(0)
            dispose = () => {
              gsap.ticker.remove(update)
              lenis.off('scroll', onScroll)
              lenis.destroy()
              if (window.__lenis === lenis) delete window.__lenis
            }
          }).catch(() => { /* Native scrolling remains available. */ })
      }, 0)
    }
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })

    return () => {
      cancelled = true
      window.removeEventListener('load', start)
      if (timer !== undefined) window.clearTimeout(timer)
      dispose?.()
    }
  }, [])

  return <>{children}</>
}

export default SmoothScroll
