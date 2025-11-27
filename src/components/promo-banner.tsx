'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface PromoBannerData {
  id: string
  title: string
  description: string
  image: string
  link: string
  button_text: string
  position: 'top' | 'bottom'
  is_active: boolean
}

interface PromoBannerProps {
  position: 'top' | 'bottom'
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
        console.error('Error loading promo banner:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadBanner()

    // Reload every 10 seconds to catch updates
    const interval = setInterval(loadBanner, 10000)
    return () => clearInterval(interval)
  }, [position])

  if (isLoading || !banner) {
    return null
  }

  return (
    <section className="py-8 bg-white border-t border-gray-100">
      <Link 
        href={banner.link || '/tum-urunler'} 
        className="group relative block w-full overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:shadow-2xl transition-all duration-300"
      >
        {/* Background Image */}
        {banner.image && (
          <div className="absolute inset-0 opacity-20">
            <Image
              src={banner.image}
              alt={banner.title}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="relative w-full px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="container max-w-7xl mx-auto">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-light mb-4 tracking-tight">
                {banner.title}
              </h2>
              {banner.description && (
                <p className="text-lg md:text-xl text-gray-200 mb-6 max-w-xl">
                  {banner.description}
                </p>
              )}
              <span className="inline-flex items-center gap-2 text-base font-medium group-hover:gap-4 transition-all duration-300">
                {banner.button_text || 'Tüm Ürünleri Keşfet'}
                <span className="transform transition-transform group-hover:translate-x-1">→</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}

