'use client'

import { useEffect, useRef, useState } from 'react'
import Image from '@/components/responsive-image'
import Link from 'next/link'
import BrandMarquee, { type BrandLogo } from '@/components/BrandMarquee'

export type CampaignSlide = {
  src: string
  alt: string
  href: string
  width?: number
  height?: number
}

type HomeEditorialStackProps = {
  brands: BrandLogo[]
  whiteLogos?: boolean
  banners?: CampaignSlide[]
}

export default function HomeEditorialStack({
  brands,
  whiteLogos = false,
  banners = [],
}: HomeEditorialStackProps) {
  const slides = banners.filter((banner) => banner.src && banner.href)
  const [current, setCurrent] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused
  const [loaded, setLoaded] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const total = slides.length
  const index = total > 0 ? ((current % total) + total) % total : 0

  useEffect(() => {
    const onLoad = () => setLoaded(true)
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotionChange = () => setReducedMotion(mq.matches)
    onMotionChange()
    mq.addEventListener('change', onMotionChange)
    return () => { window.removeEventListener('load', onLoad); mq.removeEventListener('change', onMotionChange) }
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)))
    observer.observe(section)
    return () => observer.disconnect()
  }, [total])

  useEffect(() => {
    if (total < 2 || paused || !loaded || !visible || reducedMotion) return
    const timer = window.setInterval(() => {
      setCurrent((value) => (value + 1) % total)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [paused, total, index, loaded, visible, reducedMotion])

  if (total === 0) {
    return (
      <>
        <BrandMarquee brands={brands} whiteLogos={whiteLogos} />
      </>
    )
  }

  return (
    <>
      <section
        ref={sectionRef}
        className="fh-slider fh-campaign"
        aria-roledescription="carousel"
        aria-label="Kampanya bannerları"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false) }}
      >
        <div className="fh-campaign-viewport">
          <div
            className="fh-campaign-track"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((banner, slideIndex) => (
              <Link
                key={`${banner.src}-${slideIndex}`}
                href={banner.href}
                className="fh-campaign-slide"
                aria-label={banner.alt}
                tabIndex={slideIndex === index ? 0 : -1}
                aria-hidden={slideIndex === index ? undefined : true}
              >
                <Image
                  src={banner.src}
                  alt={banner.alt}
                  width={banner.width || 2172}
                  height={banner.height || 724}
                  priority={slideIndex === 0}
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                  sizes="100vw"
                  style={{ width: '100%', height: 'auto' }}
                />
              </Link>
            ))}
          </div>
        </div>
        <div className="fh-controls">
          <button
            type="button"
            className="fh-nav"
            aria-label="Önceki banner"
            onClick={() => setCurrent((value) => (value - 1 + total) % total)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 6 9 12l6 6" />
            </svg>
          </button>
          {slides.map((banner, dotIndex) => (
            <button
              key={`${banner.src}-dot-${dotIndex}`}
              type="button"
              className="fh-dot"
              aria-label={`Banner ${dotIndex + 1}`}
              aria-current={dotIndex === index ? 'true' : undefined}
              onClick={() => setCurrent(dotIndex)}
            />
          ))}
          <button
            type="button"
            className="fh-nav"
            aria-label="Sonraki banner"
            onClick={() => setCurrent((value) => (value + 1) % total)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </section>
      <BrandMarquee brands={brands} whiteLogos={whiteLogos} />
    </>
  )
}
