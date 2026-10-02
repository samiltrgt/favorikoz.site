'use client'

import { RefObject, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { FrameSequenceRenderer } from '@/lib/renderer/FrameSequenceRenderer'
import type { ISequenceRenderer, CanvasMetrics } from '@/lib/renderer/types'
import {
  FRAME_CONFIG,
  SCROLL_CONFIG,
  getFrameCount,
  getFrameIndices,
  getFrameUrl,
  getMaxDpr,
} from '@/lib/animation/scrollConfig'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
}

const MOBILE_MAX = FRAME_CONFIG.breakpoints.mobile - 1

export interface UseSpriteScrollParams {
  sectionRef: RefObject<HTMLElement>
  pinRef: RefObject<HTMLElement>
  canvasRef: RefObject<HTMLCanvasElement>
  overlayRef: RefObject<HTMLElement>
  posterRef: RefObject<HTMLImageElement>
  enabled: boolean
}

export function useSpriteScroll({
  sectionRef,
  pinRef,
  canvasRef,
  overlayRef,
  posterRef,
  enabled,
}: UseSpriteScrollParams): void {
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    const section = sectionRef.current
    const pin = pinRef.current
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    const poster = posterRef.current
    if (!section || !pin || !canvas) return

    // Input (scroll) and render are decoupled: ScrollTrigger only writes `target`,
    // a single gsap.ticker loop eases `current` toward it and draws.
    const play = { current: 0, target: 0 }
    let renderer: ISequenceRenderer | null = null
    let mm: gsap.MatchMedia | null = null
    let observer: IntersectionObserver | null = null

    let resizeRafId = 0
    let lastDrawnFrame = -1
    let started = false
    let paused = typeof document !== 'undefined' ? document.hidden : false
    let lastWidth = window.innerWidth

    const frameCount = getFrameCount(window.innerWidth)
    const lastFrame = frameCount - 1
    const fadeStart = SCROLL_CONFIG.overlayFadeStart
    const fadeRange = SCROLL_CONFIG.overlayFadeEnd - SCROLL_CONFIG.overlayFadeStart

    const computeMetrics = (): CanvasMetrics => ({
      cssWidth: window.innerWidth,
      cssHeight: window.innerHeight,
      dpr: Math.min(window.devicePixelRatio || 1, getMaxDpr(window.innerWidth)),
    })

    const resizeCanvas = (): void => {
      if (!renderer) return
      renderer.resize(computeMetrics())
    }

    const urls = getFrameIndices(frameCount).map(getFrameUrl)
    renderer = new FrameSequenceRenderer(canvas, {
      frameUrls: urls,
      preloadCount: FRAME_CONFIG.preloadCount,
      preloadBatchSize: FRAME_CONFIG.preloadBatchSize,
      lcpDeferMs: FRAME_CONFIG.lcpDeferMs,
    })
    resizeCanvas()

    // ── Single clock: ease current→target, draw only on integer-frame change ──
    const perFrame = 1000 / 60
    const tick = (_time: number, deltaTime: number): void => {
      if (!renderer || paused) return
      const alpha = 1 - Math.pow(1 - SCROLL_CONFIG.frameLerp, deltaTime / perFrame)
      play.current += (play.target - play.current) * alpha
      if (Math.abs(play.target - play.current) < 0.01) play.current = play.target
      const index = Math.round(play.current)
      if (index === lastDrawnFrame) return
      lastDrawnFrame = index
      renderer.drawFrame(index)
    }
    gsap.ticker.add(tick)

    const onVisibilityChange = (): void => {
      paused = document.hidden
      if (!paused) lastDrawnFrame = -1
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // dvh guard: mobile address-bar show/hide changes innerHeight but not innerWidth.
    // Resize the canvas so the frame stays crisp, but only refresh ScrollTrigger
    // (which re-pins and re-measures — the expensive, jank-causing part) on real
    // width changes.
    const onResize = (): void => {
      const width = window.innerWidth
      const widthChanged = width !== lastWidth
      lastWidth = width
      if (resizeRafId) cancelAnimationFrame(resizeRafId)
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = 0
        resizeCanvas()
        if (widthChanged) ScrollTrigger.refresh()
      })
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    const startLoading = (): void => {
      if (started || !renderer) return
      started = true
      void renderer
        .load(() => {
          if (!renderer) return
          lastDrawnFrame = -1
          const index = Math.round(play.current)
          renderer.drawFrame(index)
          lastDrawnFrame = index
          if (poster) poster.style.opacity = '0'
        })
        .catch(() => {
          /* network/decoding failures keep the poster visible */
        })
    }

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            startLoading()
            observer?.disconnect()
            observer = null
            break
          }
        }
      },
      { rootMargin: '200px 0px' },
    )
    observer.observe(section)

    // ── Device-branched ScrollTrigger (matchMedia) ──
    mm = gsap.matchMedia()
    mm.add(
      {
        isMobile: `(max-width: ${MOBILE_MAX}px)`,
        isDesktop: `(min-width: ${FRAME_CONFIG.breakpoints.mobile}px)`,
      },
      (context) => {
        const isMobile = !!context.conditions?.isMobile
        const cfg = isMobile ? SCROLL_CONFIG.mobile : SCROLL_CONFIG.desktop

        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: () => `+=${window.innerHeight * (cfg.scrollDistanceVh / 100)}`,
          pin,
          pinSpacing: true,
          invalidateOnRefresh: true,
          onToggle: (self) => {
            // will-change belongs on the pinned wrapper (what GSAP transforms),
            // not on the canvas.
            pin.style.willChange = self.isActive ? 'transform' : 'auto'
          },
          onUpdate: (self) => {
            play.target = self.progress * lastFrame
            if (overlay) {
              const f = Math.min(1, Math.max(0, (self.progress - fadeStart) / fadeRange))
              overlay.style.opacity = String(1 - f)
              overlay.style.transform = `translate3d(0, ${-40 * f}px, 0)`
            }
          },
        })

        if (!cfg.autoPlay.enabled) return

        // ── Desktop scroll-hijack auto-play ──
        const autoPlay = cfg.autoPlay
        let autoPlayTween: gsap.core.Tween | null = null
        let autoPlayDir: 0 | 1 | -1 = 0

        const killAutoPlay = (): void => {
          if (autoPlayTween) {
            autoPlayTween.kill()
            autoPlayTween = null
          }
        }

        // useAutoKill: wheel (desktop) lets the user interrupt by scrolling again.
        // Touch fires once on finger-lift with autoKill off so native momentum
        // can't cancel the tween mid-flight; a new touch cancels it.
        const triggerAutoPlay = (deltaY: number, useAutoKill: boolean): void => {
          if (!st.isActive || deltaY === 0) return

          const goingDown = deltaY > 0
          const dir: 1 | -1 = goingDown ? 1 : -1

          if (autoPlayTween && autoPlayDir === dir) return
          if (autoPlayTween && autoPlayDir !== dir) killAutoPlay()

          const start = st.start
          const end = st.end
          const range = end - start
          if (range <= 0) return

          const current = window.scrollY || window.pageYOffset
          const progress = (current - start) / range

          if (goingDown && progress < autoPlay.startThreshold) return
          if (!goingDown && progress <= autoPlay.startThreshold) return

          let target: number
          if (goingDown) {
            const nextEl = section.nextElementSibling as HTMLElement | null
            target = nextEl ? nextEl.getBoundingClientRect().top + current : end
          } else {
            target = start
          }

          const remaining = Math.abs(target - current)
          if (remaining <= 1) return

          autoPlayDir = dir
          const duration = remaining / autoPlay.pixelsPerSecond
          autoPlayTween = gsap.to(window, {
            scrollTo: { y: target, autoKill: useAutoKill },
            duration,
            ease: autoPlay.ease,
            onComplete: killAutoPlay,
            onInterrupt: killAutoPlay,
          })
        }

        const wheelHandler = (e: WheelEvent): void => triggerAutoPlay(e.deltaY, true)

        const TOUCH_MIN_DELTA = 6
        let touchStartY = 0
        let touchPrevY = 0
        let touchDir: 0 | 1 | -1 = 0

        const touchStartHandler = (e: TouchEvent): void => {
          killAutoPlay()
          const y = e.touches[0]?.clientY ?? 0
          touchStartY = y
          touchPrevY = y
          touchDir = 0
        }
        const touchMoveHandler = (e: TouchEvent): void => {
          const y = e.touches[0]?.clientY ?? 0
          const d = touchPrevY - y
          if (Math.abs(d) > 0) touchDir = d > 0 ? 1 : -1
          touchPrevY = y
        }
        const touchEndHandler = (): void => {
          const totalDelta = touchStartY - touchPrevY
          if (touchDir === 0 || Math.abs(totalDelta) < TOUCH_MIN_DELTA) return
          triggerAutoPlay(touchDir, false)
        }

        window.addEventListener('wheel', wheelHandler, { passive: true })
        window.addEventListener('touchstart', touchStartHandler, { passive: true })
        window.addEventListener('touchmove', touchMoveHandler, { passive: true })
        window.addEventListener('touchend', touchEndHandler, { passive: true })

        return () => {
          killAutoPlay()
          window.removeEventListener('wheel', wheelHandler)
          window.removeEventListener('touchstart', touchStartHandler)
          window.removeEventListener('touchmove', touchMoveHandler)
          window.removeEventListener('touchend', touchEndHandler)
        }
      },
      section,
    )

    return () => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      gsap.ticker.remove(tick)
      observer?.disconnect()
      observer = null
      mm?.revert()
      mm = null
      pin.style.willChange = 'auto'
      renderer?.dispose()
      renderer = null
    }
  }, [enabled, sectionRef, pinRef, canvasRef, overlayRef, posterRef])
}

export default useSpriteScroll
