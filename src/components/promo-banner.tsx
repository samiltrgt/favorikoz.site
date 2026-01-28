'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

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

  // Banner'ın tıklanabilir olup olmadığını kontrol et
  const hasLink = banner.link && banner.link.trim() !== ''
  
  // Banner içeriği
  const bannerContent = (
    <div className="relative block w-full overflow-hidden min-h-[180px] md:min-h-[200px] lg:min-h-0 lg:[aspect-ratio:1910/250] flex items-center justify-center bg-gray-50">
      {/* Background Image - Full opacity, no overlay, contains to show full banner */}
      {banner.image && (
        <Image
          src={banner.image}
          alt={banner.title || 'Promo banner'}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />
      )}
    </div>
  )

  return (
    <section className="relative bg-white border-t border-gray-100">
      {hasLink ? (
        <Link 
          href={banner.link} 
          className="block group cursor-pointer transition-opacity duration-300 hover:opacity-90"
          aria-label={banner.title}
        >
          {bannerContent}
        </Link>
      ) : (
        bannerContent
      )}
    </section>
  )
}
