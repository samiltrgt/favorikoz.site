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

    const playhead = { frame: 0 }
    let renderer: ISequenceRenderer | null = null
    let ctx: gsap.Context | null = null
    let observer: IntersectionObserver | null = null

    let drawRafId = 0
    let resizeRafId = 0
    let lastDrawnFrame = -1
    let started = false
    let paused = typeof document !== 'undefined' ? document.hidden : false
    let autoPlayCleanup: (() => void) | null = null

    const computeMetrics = (): CanvasMetrics => ({
      cssWidth: window.innerWidth,
      cssHeight: window.innerHeight,
      dpr: Math.min(window.devicePixelRatio || 1, getMaxDpr(window.innerWidth)),
    })

    const resizeCanvas = (): void => {
      if (!renderer) return
      renderer.resize(computeMetrics())
    }

    const scheduleDraw = (): void => {
      if (drawRafId) return
      drawRafId = requestAnimationFrame(() => {
        drawRafId = 0
        if (!renderer || paused) return
        const index = Math.round(playhead.frame)
        if (index === lastDrawnFrame) return
        lastDrawnFrame = index
        renderer.drawFrame(index)
      })
    }

    const frameCount = getFrameCount(window.innerWidth)
    const urls = getFrameIndices(frameCount).map(getFrameUrl)
    renderer = new FrameSequenceRenderer(canvas, {
      frameUrls: urls,
      preloadCount: FRAME_CONFIG.preloadCount,
      preloadBatchSize: FRAME_CONFIG.preloadBatchSize,
      lcpDeferMs: FRAME_CONFIG.lcpDeferMs,
    })
    resizeCanvas()

    const onVisibilityChange = (): void => {
      paused = document.hidden
      if (!paused) {
        lastDrawnFrame = -1
        scheduleDraw()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const onResize = (): void => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId)
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = 0
        resizeCanvas()
        ScrollTrigger.refresh()
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
          renderer.drawFrame(Math.round(playhead.frame))
          lastDrawnFrame = Math.round(playhead.frame)
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

    let autoPlayTween: gsap.core.Tween | null = null

    const killAutoPlay = (): void => {
      if (autoPlayTween) {
        autoPlayTween.kill()
        autoPlayTween = null
      }
    }

    ctx = gsap.context(() => {
      const lastFrame = frameCount - 1
      const fadeDuration = SCROLL_CONFIG.overlayFadeEnd - SCROLL_CONFIG.overlayFadeStart
      const autoPlay = SCROLL_CONFIG.autoPlay

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${window.innerHeight * (SCROLL_CONFIG.scrollDistanceVh / 100)}`,
          pin,
          pinSpacing: true,
          scrub: SCROLL_CONFIG.scrub,
          invalidateOnRefresh: true,
          onToggle: (self) => {
            canvas.style.willChange = self.isActive ? 'transform' : 'auto'
          },
        },
      })

      const st = timeline.scrollTrigger

      if (autoPlay.enabled && st) {
        let autoPlayDir: 0 | 1 | -1 = 0

        const onWheelOrTouch = (deltaY: number): void => {
          if (!st.isActive || deltaY === 0) return

          const goingDown = deltaY > 0
          const dir: 1 | -1 = goingDown ? 1 : -1

          // Already auto-playing the same direction: let it run.
          if (autoPlayTween && autoPlayDir === dir) return
          // Reversed mid-flight: kill the current tween and re-aim the other way.
          if (autoPlayTween && autoPlayDir !== dir) killAutoPlay()

          const start = st.start
          const end = st.end
          const range = end - start
          if (range <= 0) return

          const current = window.scrollY || window.pageYOffset
          const progress = (current - start) / range

          // Require a small scroll into the hero before auto-play engages.
          if (goingDown && progress < autoPlay.startThreshold) return
          if (!goingDown && progress <= autoPlay.startThreshold) return

          let target: number
          if (goingDown) {
            // Continue past the hero end straight into the next section (products carousel),
            // so finishing the animation flows seamlessly down to it in one motion.
            const nextEl = section.nextElementSibling as HTMLElement | null
            target = nextEl
              ? nextEl.getBoundingClientRect().top + current
              : end
          } else {
            target = start
          }

          const remaining = Math.abs(target - current)
          if (remaining <= 1) return

          autoPlayDir = dir
          const duration = remaining / autoPlay.pixelsPerSecond
          autoPlayTween = gsap.to(window, {
            scrollTo: { y: target, autoKill: true },
            duration,
            ease: autoPlay.ease,
            onComplete: killAutoPlay,
            onInterrupt: killAutoPlay,
          })
        }

        const wheelHandler = (e: WheelEvent): void => onWheelOrTouch(e.deltaY)

        let touchLastY = 0
        const touchStartHandler = (e: TouchEvent): void => {
          touchLastY = e.touches[0]?.clientY ?? 0
        }
        const touchMoveHandler = (e: TouchEvent): void => {
          const y = e.touches[0]?.clientY ?? 0
          // Swipe up (content moves down) => deltaY positive, like wheel.
          onWheelOrTouch(touchLastY - y)
          touchLastY = y
        }

        window.addEventListener('wheel', wheelHandler, { passive: true })
        window.addEventListener('touchstart', touchStartHandler, { passive: true })
        window.addEventListener('touchmove', touchMoveHandler, { passive: true })

        autoPlayCleanup = () => {
          window.removeEventListener('wheel', wheelHandler)
          window.removeEventListener('touchstart', touchStartHandler)
          window.removeEventListener('touchmove', touchMoveHandler)
        }
      }

      timeline.to(
        playhead,
        {
          frame: lastFrame,
          ease: 'none',
          duration: 1,
          onUpdate: scheduleDraw,
        },
        0,
      )

      if (overlay) {
        timeline.to(
          overlay,
          {
            opacity: 0,
            y: -40,
            ease: 'none',
            duration: fadeDuration,
          },
          SCROLL_CONFIG.overlayFadeStart,
        )
      }
    }, section)

    return () => {
      if (drawRafId) cancelAnimationFrame(drawRafId)
      if (resizeRafId) cancelAnimationFrame(resizeRafId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      autoPlayCleanup?.()
      autoPlayCleanup = null
      killAutoPlay()
      observer?.disconnect()
      observer = null
      ctx?.revert()
      ctx = null
      canvas.style.willChange = 'auto'
      renderer?.dispose()
      renderer = null
    }
  }, [enabled, sectionRef, pinRef, canvasRef, overlayRef, posterRef])
}

export default useSpriteScroll
