'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface PromoBannerData {
  id: string
  title: string
  description: string
  image: string
  link: string
  button_text: string
  position: 'top' | 'bottom' | 'footer'
  is_active: boolean
}

interface PromoBannerProps {
  position: 'top' | 'bottom' | 'footer'
}

export default function PromoBanner({ position }: PromoBannerProps) {
  const [banner, setBanner] = useState<PromoBannerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadBanner = async () => {
      try {
        const response = await fetch(`/api/promo-banners?position=${position}`, {
          cache: 'no-store',
          next: { revalidate: 0 }
        })
        const result = await response.json()

        if (result.success && result.data && result.data.length > 0) {
          setBanner(result.data[0])
        }
      } catch (error) {
        console.error(`Error loading promo banner [${position}]:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    loadBanner()
    
    const interval = setInterval(loadBanner, 10000)
    return () => clearInterval(interval)
  }, [position])

  if (isLoading || !banner) {
    return null
  }

  return (
    <section className="relative bg-white border-t border-gray-100">
      <div className="relative block w-full overflow-hidden h-[200px] md:h-[250px] lg:h-auto lg:[aspect-ratio:1910/250]">
        {/* Background Image - Full opacity, no overlay */}
        {banner.image && (
          <Image
            src={banner.image}
            alt={banner.title || 'Promo banner'}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        )}
      </div>
    </section>
  )
}
