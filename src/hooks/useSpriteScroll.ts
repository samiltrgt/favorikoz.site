'use client'

import { RefObject, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FrameSequenceRenderer } from '@/lib/renderer/FrameSequenceRenderer'
import type { ISequenceRenderer, CanvasMetrics } from '@/lib/renderer/types'
import {
  FRAME_CONFIG,
  SCROLL_CONFIG,
  getFrameCount,
  getFrameIndices,
  getFrameUrl,
} from '@/lib/animation/scrollConfig'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
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

    const computeMetrics = (): CanvasMetrics => ({
      cssWidth: window.innerWidth,
      cssHeight: window.innerHeight,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
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

    ctx = gsap.context(() => {
      const lastFrame = frameCount - 1
      const fadeDuration = SCROLL_CONFIG.overlayFadeEnd - SCROLL_CONFIG.overlayFadeStart

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
