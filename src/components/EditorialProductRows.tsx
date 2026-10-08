'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import CatalogProductCard from '@/components/product-card'
import ProductImage from '@/components/product-image'
import './EditorialProductRows.css'

export type EditorialProduct = {
  id: string
  slug: string
  name: string
  subtitle?: string
  href: string
  image: string
  imageAlt?: string
  displayPrice: string
  price: number
  originalPrice?: number | null
  brand?: string
  rating?: number
  reviewsCount?: number
  outOfStock?: boolean
  stockLabel?: string
  swatchColor?: string
  isNew?: boolean
  isBestSeller?: boolean
  images?: string[]
}

export type EditorialCategory = {
  id: string
  title: string
  products: EditorialProduct[]
  /** Position of the fixed heading/arrow tile in the four-column row. */
  controlSlot?: 0 | 1 | 2 | 3
}

export type EditorialProductRowsProps = {
  categories: EditorialCategory[]
  loop?: boolean
  label?: string
}

const PAGE_SIZE = 3
const MOBILE_PAGE_SIZE = 2
const SLIDE_MS = 560
const SLIDE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const DRAG_LOCK_PX = 8
const FLICK_MS = 280
const RUBBER = 0.32

type DragSession = {
  pointerId: number
  originX: number
  originY: number
  originOffset: number
  lastX: number
  lastT: number
  vx: number
  axis: 'undecided' | 'x' | 'y'
}

function resist(index: number, min: number, max: number) {
  if (index < min) return min + (index - min) * RUBBER
  if (index > max) return max + (index - max) * RUBBER
  return index
}

function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={back ? 'M20 12H4m6-6-6 6 6 6' : 'M4 12h16m-6-6 6 6-6 6'} />
    </svg>
  )
}

function ProductCard({ product }: { product: EditorialProduct }) {
  return (
    <CatalogProductCard
      product={{
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        subtitle: product.subtitle,
        price: product.price,
        original_price: product.originalPrice,
        image: product.image,
        rating: product.rating,
        reviews_count: product.reviewsCount,
        in_stock: !product.outOfStock,
        is_new: product.isNew,
        is_best_seller: product.isBestSeller,
        images: product.images,
      }}
    />
  )
}

/** Compact 2-col mobile card — title / subtitle / price stack like the reference. */
function MobileProductCard({ product }: { product: EditorialProduct }) {
  const href = product.href || `/urun/${product.slug}`
  const brandLine =
    product.brand &&
    product.brand.trim().toLowerCase() !== product.name.trim().toLowerCase()
      ? product.brand
      : ''
  const subtitle = product.subtitle?.trim() || brandLine
  const oosLabel = product.stockLabel?.trim() || 'Stok Yok'

  return (
    <article className="ep-mcard">
      <Link href={href} className="ep-mcard__media" aria-label={product.name}>
        <ProductImage
          src={product.image}
          alt={product.imageAlt || product.name}
          fill
          coverClassName="object-cover"
          containClassName="object-cover"
          sizes="50vw"
        />
        {product.outOfStock && (
          <span className="ep-mcard__oos">{oosLabel}</span>
        )}
      </Link>
      <div className="ep-mcard__body">
        <div className="ep-mcard__copy">
          <Link href={href} className="ep-mcard__name">
            {product.name}
          </Link>
          {subtitle ? <p className="ep-mcard__sub">{subtitle}</p> : null}
          <p className="ep-mcard__price">{product.displayPrice}</p>
        </div>
        {product.swatchColor ? (
          <span
            className="ep-mcard__swatch"
            style={{ background: product.swatchColor }}
            aria-hidden
          />
        ) : null}
      </div>
    </article>
  )
}

function ProductRail({
  products,
  offsetIndex,
  step,
  reducedMotion,
  dragging,
  base = 0,
  Card = ProductCard,
}: {
  products: EditorialProduct[]
  offsetIndex: number
  step: number
  reducedMotion: boolean
  dragging: boolean
  /** Extra product slots this pane is shifted by, relative to the row offset. */
  base?: number
  Card?: (props: { product: EditorialProduct }) => JSX.Element
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el || dragging || step <= 0) return
    el.style.transition = reducedMotion ? 'none' : `transform ${SLIDE_MS}ms ${SLIDE_EASE}`
    el.style.transform = `translate3d(${-offsetIndex * step}px, 0, 0)`
  }, [offsetIndex, step, reducedMotion, dragging])

  if (products.length === 0) return null

  return (
    <div className="ep-rail">
      <div ref={trackRef} className="ep-track" data-base={base} style={{ '--ep-offset': -offsetIndex } as CSSProperties}>
        {products.map((product) => (
          <div className="ep-slide" key={product.id}>
            <Card product={product} />
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoryRow({
  category,
  slot,
  loop,
}: {
  category: EditorialCategory
  slot: number
  loop: boolean
}) {
  const [start, setStart] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [step, setStep] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [dragging, setDragging] = useState(false)
  const rowRef = useRef<HTMLElement>(null)
  const controlRef = useRef<HTMLDivElement>(null)
  const arrowsRef = useRef<HTMLDivElement>(null)
  const arrowBounds = useRef<{ top: number; min: number; max: number } | null>(null)
  const lastMeasuredWidth = useRef('')
  const dragRef = useRef<DragSession | null>(null)
  const suppressClick = useRef(false)
  const gestureId = useRef(0)
  const id = useId()

  const count = category.products.length
  const pageSize = isMobile ? MOBILE_PAGE_SIZE : PAGE_SIZE
  const maxStart = Math.max(0, count - pageSize)
  const currentStart = loop && count ? ((start % count) + count) % count : Math.min(start, maxStart)
  const canMove = count > pageSize
  const leftCount = slot
  const rightCount = PAGE_SIZE - slot

  const measure = useCallback(() => {
    const row = rowRef.current
    if (!row) return
    const styles = getComputedStyle(row)
    const mobile = window.matchMedia('(max-width: 639px)').matches
    const gap = mobile
      ? 12
      : Number.parseFloat(styles.columnGap || styles.gap) || 20
    const width = row.clientWidth
    const cols = mobile ? MOBILE_PAGE_SIZE : 4
    const col = (width - gap * (cols - 1)) / cols
    if (!(col > 0)) return
    const measurement = `${width}:${gap}:${cols}`
    if (lastMeasuredWidth.current === measurement) return
    lastMeasuredWidth.current = measurement
    arrowBounds.current = null
    row.style.setProperty('--ep-col', `${col}px`)
    row.style.setProperty('--ep-gap', `${gap}px`)
    setStep(col + gap)
  }, [])

  useEffect(() => {
    measure()
    const row = rowRef.current
    if (!row) return
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    return () => ro.disconnect()
  }, [measure, count, isMobile])

  useEffect(() => {
    const invalidate = () => { arrowBounds.current = null }
    window.addEventListener('scroll', invalidate, { passive: true })
    return () => window.removeEventListener('scroll', invalidate)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', apply)
    else mq.addListener(apply)
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', apply)
      else mq.removeListener(apply)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', apply)
    else mq.addListener(apply)
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', apply)
      else mq.removeListener(apply)
    }
  }, [])

  const settle = (next: number) => {
    const clamped = loop && count
      ? ((next % count) + count) % count
      : Math.max(0, Math.min(maxStart, next))
    if (Math.abs(clamped - currentStart) < 0.001) return
    setStart(clamped)
    const first = category.products[Math.round(clamped)]
    if (first) {
      setAnnouncement(`${category.title}: ${first.name} ile başlayan ürünler gösteriliyor.`)
    }
  }

  const move = (delta: number) => {
    if (!canMove || dragging) return
    const base = delta > 0 ? Math.floor(currentStart + 0.001) : Math.ceil(currentStart - 0.001)
    const next = loop
      ? ((base + delta) % count + count) % count
      : Math.max(0, Math.min(maxStart, base + delta))
    settle(next)
  }

  const paintOffset = (index: number) => {
    const row = rowRef.current
    if (!row || !(step > 0)) return
    row.querySelectorAll<HTMLElement>('.ep-track').forEach((el) => {
      const base = Number(el.dataset.base || '0')
      el.style.transition = 'none'
      el.style.transform = `translate3d(${-(index + base) * step}px, 0, 0)`
    })
  }

  const onRowPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    suppressClick.current = false
    if (!canMove || !(step > 0)) return
    if (event.button !== 0) return
    if ((event.target as Element).closest('button')) return
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      originOffset: currentStart,
      lastX: event.clientX,
      lastT: event.timeStamp,
      vx: 0,
      axis: 'undecided',
    }
  }

  const onRowPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const session = dragRef.current
    if (!session || session.pointerId !== event.pointerId) return

    const dx = event.clientX - session.originX
    const dy = event.clientY - session.originY

    if (session.axis === 'undecided') {
      if (Math.abs(dx) < DRAG_LOCK_PX && Math.abs(dy) < DRAG_LOCK_PX) return
      if (Math.abs(dy) > Math.abs(dx)) {
        dragRef.current = null
        return
      }
      session.axis = 'x'
      gestureId.current += 1
      suppressClick.current = true
      setDragging(true)
      if (rowRef.current) {
        rowRef.current.style.touchAction = 'none'
        try {
          rowRef.current.setPointerCapture(event.pointerId)
        } catch {
          /* Pointer capture is optional; the row still tracks the gesture. */
        }
      }
    }

    const dt = event.timeStamp - session.lastT
    if (dt > 0) {
      const sample = (event.clientX - session.lastX) / dt
      session.vx = session.vx * 0.65 + sample * 0.35
    }
    session.lastX = event.clientX
    session.lastT = event.timeStamp

    const raw = session.originOffset - dx / step
    paintOffset(resist(raw, 0, maxStart))
  }

  const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
    const session = dragRef.current
    if (!session || session.pointerId !== event.pointerId) return
    dragRef.current = null

    if (session.axis !== 'x') return

    const dx = event.clientX - session.originX
    const raw = session.originOffset - dx / step
    const stale = event.timeStamp - session.lastT > 80
    const projected = resist(raw, 0, maxStart) - (stale ? 0 : (session.vx / step) * FLICK_MS)
    const next = Math.max(0, Math.min(maxStart, projected))

    if (rowRef.current) {
      rowRef.current.style.touchAction = ''
      if (rowRef.current.hasPointerCapture(event.pointerId)) {
        rowRef.current.releasePointerCapture(event.pointerId)
      }
    }
    setDragging(false)
    settle(next)
    const id = gestureId.current
    window.setTimeout(() => {
      if (gestureId.current === id) suppressClick.current = false
    }, 250)
  }

  const onControlPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return
    const control = controlRef.current
    const arrows = arrowsRef.current
    if (!control || !arrows) return
    if (window.matchMedia('(max-width: 639px)').matches) return

    // Measure once on entry/resize/scroll, rather than forcing a layout read
    // after every pointer-follow style write.
    if (!arrowBounds.current) {
      const rect = control.getBoundingClientRect()
      const arrowsHeight = arrows.offsetHeight
      const pad = 12
      arrowBounds.current = { top: rect.top, min: arrowsHeight / 2 + pad, max: rect.height - arrowsHeight / 2 - pad }
    }
    const { top, min, max } = arrowBounds.current
    if (max <= min) return
    const y = event.clientY - top
    const clamped = Math.min(max, Math.max(min, y))
    arrows.style.top = `${clamped}px`
    arrows.style.bottom = 'auto'
    arrows.style.transform = 'translateY(-50%)'
  }

  const resetArrowFollow = () => {
    arrowBounds.current = null
    const arrows = arrowsRef.current
    if (!arrows) return
    arrows.style.top = ''
    arrows.style.bottom = ''
    arrows.style.transform = ''
  }

  if (!count) return null

  const prevDisabled = !canMove || (!loop && currentStart <= 0.001)
  const nextDisabled = !canMove || (!loop && currentStart >= maxStart - 0.001)

  return (
    <section
      ref={rowRef}
      className={dragging ? 'ep-row is-dragging' : 'ep-row'}
      aria-labelledby={id}
      aria-roledescription="carousel"
      style={{ '--ep-slot': slot } as CSSProperties}
      onPointerDown={onRowPointerDown}
      onPointerMove={onRowPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault()
          event.stopPropagation()
          suppressClick.current = false
        }
      }}
    >
      {leftCount > 0 && (
        <div
          className="ep-pane ep-pane--desktop ep-pane--left"
          style={{ gridColumn: `1 / span ${leftCount}` }}
        >
          <ProductRail
            products={category.products}
            offsetIndex={currentStart}
            step={step}
            reducedMotion={reducedMotion}
            dragging={dragging}
          />
        </div>
      )}

      <div
        ref={controlRef}
        className="ep-control"
        style={{ gridColumn: slot + 1 }}
        onPointerMove={onControlPointerMove}
        onPointerLeave={resetArrowFollow}
      >
        <div ref={arrowsRef} className="ep-arrows">
          <button
            type="button"
            aria-label={`${category.title}: önceki ürünler`}
            disabled={prevDisabled}
            onClick={() => move(-1)}
          >
            <Arrow back />
          </button>
          <button
            type="button"
            aria-label={`${category.title}: sonraki ürünler`}
            disabled={nextDisabled}
            onClick={() => move(1)}
          >
            <Arrow />
          </button>
        </div>
        <h2 id={id}>{category.title}</h2>
      </div>

      {rightCount > 0 && (
        <div
          className="ep-pane ep-pane--desktop ep-pane--right"
          style={{ gridColumn: `${slot + 2} / span ${rightCount}` }}
        >
          <ProductRail
            products={category.products}
            offsetIndex={currentStart + leftCount}
            step={step}
            reducedMotion={reducedMotion}
            dragging={dragging}
            base={leftCount}
          />
        </div>
      )}

      <div className="ep-pane ep-pane--mobile">
        <ProductRail
          products={category.products}
          offsetIndex={currentStart}
          step={step}
          reducedMotion={reducedMotion}
          dragging={dragging}
          Card={MobileProductCard}
        />
      </div>

      <span className="ep-sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </section>
  )
}

/** Three product cells and one stationary editorial title cell per category. */
export default function EditorialProductRows({
  categories,
  loop = true,
  label = 'Ürün koleksiyonları',
}: EditorialProductRowsProps) {
  const slots = [1, 3, 0] as const
  return (
    <div className="ep-collections" role="region" aria-label={label}>
      {categories.map((category, index) => (
        <CategoryRow
          key={category.id}
          category={category}
          slot={category.controlSlot ?? slots[index % slots.length]}
          loop={loop}
        />
      ))}
    </div>
  )
}
