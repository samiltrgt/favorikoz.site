'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './BannerBrands.css'

export type BrandLogo = {
  name: string
  /** Prefer transparent SVG/PNG assets. When omitted, the brand name is rendered as text. */
  src?: string
  width?: number
  /** When set, the text brand is stacked one line per entry. */
  lines?: readonly string[]
}

export type BrandMarqueeProps = {
  brands: BrandLogo[]
  /** Approx px per frame at 60fps; mirrors Fontenay product marquee feel. */
  speed?: number
  backgroundColor?: string
  /** Makes transparent monochrome logo assets white, as in the reference. */
  whiteLogos?: boolean
  label?: string
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const DEFAULT_SPEED = 0.55

function wrapOffset(offset: number, half: number) {
  if (!(half > 0)) return offset
  let next = offset % half
  if (next > 0) next -= half
  return next
}

/** Enough copies so one half of the track is always wider than the viewport. */
function buildLoopItems(brands: BrandLogo[]) {
  if (brands.length === 0) return []
  const minCopies = Math.max(6, brands.length * 2)
  const items: BrandLogo[] = []
  while (items.length < minCopies) items.push(...brands)
  return items
}

export default function BrandMarquee({
  brands,
  speed = DEFAULT_SPEED,
  backgroundColor = '#9a3d6a',
  whiteLogos = true,
  label = 'Markalarımız',
}: BrandMarqueeProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const halfWidthRef = useRef(0)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ x: number; startTranslate: number } | null>(null)
  const visibleRef = useRef(false)
  const reducedRef = useRef(false)
  const pausedRef = useRef(false)
  const [paused, setPaused] = useState(false)

  const loopSource = buildLoopItems(brands)
  const duplicated = [...loopSource, ...loopSource]

  const syncMoving = useCallback(() => {
    const moving =
      isDraggingRef.current ||
      (!pausedRef.current &&
        !reducedRef.current &&
        visibleRef.current &&
        !document.hidden)
    trackRef.current?.classList.toggle('is-moving', moving)
  }, [])

  const updateHalfWidth = useCallback(() => {
    requestAnimationFrame(() => {
      if (trackRef.current) halfWidthRef.current = trackRef.current.offsetWidth / 2
    })
  }, [])

  useEffect(() => {
    pausedRef.current = paused
    syncMoving()
  }, [paused, syncMoving])

  useEffect(() => {
    updateHalfWidth()
    const ro = new ResizeObserver(updateHalfWidth)
    if (trackRef.current) ro.observe(trackRef.current)
    return () => ro.disconnect()
  }, [duplicated.length, updateHalfWidth])

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY)
    const applyReduced = () => {
      reducedRef.current = mq.matches
      syncMoving()
    }
    applyReduced()

    const onVisibility = () => syncMoving()

    const tick = () => {
      if (
        isDraggingRef.current ||
        pausedRef.current ||
        reducedRef.current ||
        !visibleRef.current ||
        document.hidden
      ) {
        return
      }
      const half = halfWidthRef.current
      if (!(half > 0)) return
      const next = wrapOffset(offsetRef.current - speed, half)
      offsetRef.current = next
      const el = trackRef.current
      if (el) el.style.transform = `translate3d(${next}px,0,0)`
    }

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', applyReduced)
    } else {
      mq.addListener(applyReduced)
    }
    document.addEventListener('visibilitychange', onVisibility)
    let cancelled = false
    let removeTicker: (() => void) | undefined
    // The strip is already visible in server HTML; animation need not be in
    // the initial JavaScript bundle.
    void import('gsap').then(({ gsap }) => {
      if (cancelled) return
      gsap.ticker.add(tick)
      removeTicker = () => gsap.ticker.remove(tick)
    }).catch(() => { /* Logos remain visible if the animation chunk fails. */ })

    return () => {
      cancelled = true
      removeTicker?.()
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', applyReduced)
      } else {
        mq.removeListener(applyReduced)
      }
      document.removeEventListener('visibilitychange', onVisibility)
      trackRef.current?.classList.remove('is-moving')
    }
  }, [speed, syncMoving])

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const io = new IntersectionObserver(([entry]) => {
      visibleRef.current = !!entry?.isIntersecting
      syncMoving()
    })
    io.observe(node)
    return () => io.disconnect()
  }, [duplicated.length, syncMoving])

  useEffect(() => {
    syncMoving()
  }, [duplicated.length, syncMoving])

  if (brands.length === 0) return null

  const style = {
    '--fm-background': backgroundColor,
  } as CSSProperties

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if ((e.target as Element).closest('button')) return
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX, startTranslate: offsetRef.current }
    e.currentTarget.classList.add('is-dragging')
    trackRef.current?.classList.add('is-moving')
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Pointer capture unavailable; moves still update while over the strip.
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current
    if (!isDraggingRef.current || !start) return
    const next = wrapOffset(start.startTranslate + (e.clientX - start.x), halfWidthRef.current)
    offsetRef.current = next
    const el = trackRef.current
    if (el) el.style.transform = `translate3d(${next}px,0,0)`
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    dragStartRef.current = null
    e.currentTarget.classList.remove('is-dragging')
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    syncMoving()
  }

  return (
    <section
      className="fm-marquee"
      style={style}
      aria-label={label}
      data-paused={paused}
      data-white={whiteLogos}
    >
      <div
        ref={viewportRef}
        className="fm-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div ref={trackRef} className="fm-track">
          {duplicated.map((brand, index) => {
            const duplicate = index >= loopSource.length
            return (
              <div className="fm-item" key={`${brand.name}-${index}`} aria-hidden={duplicate || undefined}>
                {brand.src ? (
                  <img
                    src={brand.src}
                    alt={duplicate ? '' : brand.name}
                    style={brand.width ? { width: brand.width } : undefined}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                ) : brand.lines?.length ? (
                  <span className="fm-label fm-label-stack" lang="en">
                    {brand.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </span>
                ) : (
                  <span className="fm-label" lang="en">{brand.name}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <button
        className="fm-toggle"
        type="button"
        aria-label={paused ? 'Markaların kaymasını sürdür' : 'Markaların kaymasını duraklat'}
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
          {paused ? <path d="m7 4 9 6-9 6Z" /> : <path d="M5 4h3v12H5zm7 0h3v12h-3z" />}
        </svg>
      </button>
    </section>
  )
}
