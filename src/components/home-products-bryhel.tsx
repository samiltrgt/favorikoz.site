'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import '@/styles/home-products-bryhel.css'

const MARQUEE_SPEED = 0.6 // px per frame

interface HomeProductsBryhelProps {
  products: any[]
  title?: string
  subtitle?: string
  viewAllLink?: string
  viewAllText?: string
}

export default function HomeProductsBryhel({
  products = [],
  title = 'Fontenay Paris',
  subtitle = 'Sizin için ürettiğimiz profesyonel kalite ürünlerimiz',
  viewAllLink = '/tum-urunler',
  viewAllText = 'Tümünü Gör',
}: HomeProductsBryhelProps) {
  const innerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const didDragRef = useRef(false)
  const translateXRef = useRef(0)

  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; startTranslate: number } | null>(null)
  const [managedProducts, setManagedProducts] = useState<any[] | null>(null)

  translateXRef.current = translateX

  useEffect(() => {
    let cancelled = false
    async function loadManaged() {
      try {
        const res = await fetch('/api/own-production', { cache: 'no-store' })
        const json = await res.json()
        if (cancelled) return
        if (json.success && json.data?.length > 0) {
          const list = (json.data as any[]).map((row) => row.products).filter(Boolean)
          setManagedProducts(list)
          return
        }
      } catch {}
      if (!cancelled) setManagedProducts([])
    }
    loadManaged()
    return () => {
      cancelled = true
    }
  }, [])

  const sourceProducts = managedProducts && managedProducts.length > 0 ? managedProducts : products
  const displayProducts = sourceProducts.slice(0, 12)
  const duplicatedProducts = [...displayProducts, ...displayProducts]

  const halfWidthRef = useRef(0)
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
    if (isDragging) return
    const tick = () => {
      setTranslateX((prev) => {
        const half = halfWidthRef.current || 10000
        let next = prev - MARQUEE_SPEED
        if (next <= -half) next += half
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isDragging])

  const getClientX = (e: React.PointerEvent | PointerEvent) => e.clientX

  const onPointerDown = (e: React.PointerEvent) => {
    didDragRef.current = false
    setIsDragging(true)
    setDragStart({ x: getClientX(e), startTranslate: translateXRef.current })
  }

  useEffect(() => {
    if (!isDragging || dragStart === null) return
    const onMove = (e: PointerEvent) => {
      didDragRef.current = true
      const dx = e.clientX - dragStart.x
      setTranslateX((prev) => {
        const start = dragStart.startTranslate
        const half = halfWidthRef.current
        let next = start + dx
        while (next > 0) next -= half
        while (next < -half) next += half
        return next
      })
    }
    const onUp = () => {
      setIsDragging(false)
      setDragStart(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [isDragging, dragStart])

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
          className={`carousel carousel--marquee ${isDragging ? 'is-dragging' : ''}`}
          onPointerDown={onPointerDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div
            ref={innerRef}
            className="carousel__inner"
            style={{ transform: `translateX(${translateX}px)` }}
          >
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
                        <Image
                          src={product.image}
                          alt={product.name || ''}
                          fill
                          className="object-contain object-center"
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
