'use client'

import { useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import ProductImage from '@/components/product-image'
import '@/styles/home-products-bryhel.css'

const MARQUEE_SPEED = 0.6 // px per frame
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

interface HomeProductsBryhelProps {
  products: any[]
  title?: string
  subtitle?: string
  viewAllLink?: string
  viewAllText?: string
}

function wrapOffset(offset: number, half: number) {
  if (!(half > 0)) return offset
  let next = offset % half
  if (next > 0) next -= half
  return next
}

export default function HomeProductsBryhel({
  products = [],
  title = 'Fontenay Paris',
  subtitle = 'Sizin için ürettiğimiz profesyonel kalite ürünlerimiz',
  viewAllLink = '/tum-urunler',
  viewAllText = 'Tümünü Gör',
}: HomeProductsBryhelProps) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const halfWidthRef = useRef(0)
  const didDragRef = useRef(false)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ x: number; startTranslate: number } | null>(null)
  const visibleRef = useRef(false)
  const reducedRef = useRef(false)

  const syncMoving = useCallback(() => {
    const moving =
      isDraggingRef.current ||
      (!reducedRef.current && visibleRef.current && !document.hidden)
    innerRef.current?.classList.toggle('is-moving', moving)
  }, [])

  const displayProducts = products.slice(0, 12)
  const duplicatedProducts = [...displayProducts, ...displayProducts]

  const updateHalfWidth = useCallback(() => {
    requestAnimationFrame(() => {
      if (innerRef.current) halfWidthRef.current = innerRef.current.offsetWidth / 2
    })
  }, [])

  useEffect(() => {
    updateHalfWidth()
    const ro = new ResizeObserver(updateHalfWidth)
    if (innerRef.current) ro.observe(innerRef.current)
    return () => ro.disconnect()
  }, [duplicatedProducts.length, updateHalfWidth])

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
        reducedRef.current ||
        !visibleRef.current ||
        document.hidden
      ) {
        return
      }
      const half = halfWidthRef.current
      if (!(half > 0)) return
      const next = wrapOffset(offsetRef.current - MARQUEE_SPEED, half)
      offsetRef.current = next
      const el = innerRef.current
      if (el) el.style.transform = `translate3d(${next}px,0,0)`
    }

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', applyReduced)
    } else {
      mq.addListener(applyReduced)
    }
    document.addEventListener('visibilitychange', onVisibility)
    gsap.ticker.add(tick)

    return () => {
      gsap.ticker.remove(tick)
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', applyReduced)
      } else {
        mq.removeListener(applyReduced)
      }
      document.removeEventListener('visibilitychange', onVisibility)
      innerRef.current?.classList.remove('is-moving')
    }
  }, [syncMoving])

  useEffect(() => {
    const node = carouselRef.current
    if (!node) return
    const io = new IntersectionObserver(([entry]) => {
      visibleRef.current = !!entry?.isIntersecting
      syncMoving()
    })
    io.observe(node)
    return () => io.disconnect()
  }, [duplicatedProducts.length, syncMoving])

  useEffect(() => {
    syncMoving()
  }, [duplicatedProducts.length, syncMoving])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    didDragRef.current = false
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX, startTranslate: offsetRef.current }
    e.currentTarget.classList.add('is-dragging')
    innerRef.current?.classList.add('is-moving')
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Pointer capture is unavailable for this event; moves still update while the pointer stays over the strip.
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current
    if (!isDraggingRef.current || !start) return
    const dx = e.clientX - start.x
    if (dx !== 0) didDragRef.current = true
    const next = wrapOffset(start.startTranslate + dx, halfWidthRef.current)
    offsetRef.current = next
    const el = innerRef.current
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

  const onLinkClick = (e: React.MouseEvent) => {
    if (didDragRef.current) e.preventDefault()
  }

  if (displayProducts.length === 0) return null

  const words = title.split(' ')
  if (words.length === 0) words.push(title)

  return (
    <section
      className="component component--home-products home-products"
      id="home-products"
      data-component="home-products"
    >
      <div className="bryhel-container">
        <div className="headline --large split">
          <div className="line line--1">
            <p>
              {words.map((word, wi) => (
                <span key={wi} className={`word word--${wi + 1}`} style={{ position: 'relative', display: 'inline-block' }}>
                  {wi > 0 && ' '}
                  {word.split('').map((char, ci) => (
                    <span
                      key={ci}
                      className={`char char--${wi * 100 + ci + 1}`}
                      style={{ position: 'relative', display: 'inline-block' }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              ))}
            </p>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="carousel carousel--marquee"
          role="region"
          aria-label={`${title} ürünleri`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div ref={innerRef} className="carousel__inner">
            {duplicatedProducts.map((product, index) => (
              <div key={`${product.id}-${index}`} className="carousel__item">
                <div className="product product--card">
                  <div className="product__image">
                    <div className="image">
                      <Link
                        href={`/urun/${product.slug}`}
                        className="block w-full h-full relative"
                        onClick={onLinkClick}
                      >
                        <ProductImage
                          src={product.image}
                          alt={product.name || ''}
                          fill
                          coverClassName="object-cover object-center"
                          containClassName="object-contain object-center"
                          sizes="(max-width: 1100px) 50vw, 20vw"
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {subtitle && (
          <p className="home-products__subtitle">{subtitle}</p>
        )}

        <Link href={viewAllLink} className="bryhel-button">
          <span className="dot" />
          <span className="text">{viewAllText}</span>
        </Link>
      </div>
    </section>
  )
}
