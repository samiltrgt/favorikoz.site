'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'

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

// Sabit kategori listesi
const allCategories = [
  { name: 'Tırnak', slug: 'tirnak', subcategories: [
    { name: 'Jeller', href: '/kategori/tirnak/jeller' },
    { name: 'Cihazlar', href: '/kategori/tirnak/cihazlar' },
    { name: 'Freze Uçları', href: '/kategori/tirnak/freze-uclari' },
    { name: 'Kalıcı Oje', href: '/kategori/tirnak/kalici-oje' },
    { name: 'Protez Tırnak Malzemeleri', href: '/kategori/tirnak/protez-tirnak-malzemeleri' },
  ]},
  { name: 'Saç Bakımı', slug: 'sac-bakimi', subcategories: [
    { name: 'Saç Bakım', href: '/kategori/sac-bakimi/sac-bakim' },
    { name: 'Saç Topik', href: '/kategori/sac-bakimi/sac-topik' },
    { name: 'Saç Şekillendiriciler', href: '/kategori/sac-bakimi/sac-sekillendiriciler' },
    { name: 'Saç Fırçası ve Tarak', href: '/kategori/sac-bakimi/sac-fircasi-ve-tarak' },
  ]},
  { name: 'Kişisel Bakım', slug: 'kisisel-bakim', subcategories: [
    { name: 'Kişisel Bakım', href: '/kategori/kisisel-bakim/kisisel-bakim' },
    { name: 'Cilt Bakımı', href: '/kategori/kisisel-bakim/cilt-bakimi' },
  ]},
  { name: 'İpek Kirpik', slug: 'ipek-kirpik', subcategories: [
    { name: 'İpek Kirpikler', href: '/kategori/ipek-kirpik/ipek-kirpikler' },
    { name: 'Diğer İpek Kirpik Ürünleri', href: '/kategori/ipek-kirpik/diger-ipek-kirpik-urunleri' },
  ]},
  { name: 'Kuaför Malzemeleri', slug: 'kuafor-malzemeleri', subcategories: [
    { name: 'Tıraş Makineleri', href: '/kategori/kuafor-malzemeleri/tiras-makineleri' },
    { name: 'Diğer Kuaför Malzemeleri', href: '/kategori/kuafor-malzemeleri/diger-kuafor-malzemeleri' },
  ]},
]

export default function PromoBanner({ position }: PromoBannerProps) {
  const [banner, setBanner] = useState<PromoBannerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return

    const handleClickOutside = () => {
      setIsDropdownOpen(false)
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isDropdownOpen])

  if (isLoading || !banner) {
    return null
  }

  return (
    <section className="relative py-8 bg-white border-t border-gray-100" style={{ overflow: 'visible' }}>
      <div className="group relative block w-full bg-gradient-to-r from-gray-800 to-gray-700 text-white hover:shadow-2xl transition-all duration-300" style={{ overflow: 'visible' }}>
        {/* Background Image */}
        {banner.image && (
          <div className="absolute inset-0 opacity-40" style={{ overflow: 'hidden' }}>
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
        <div className="relative w-full px-4 sm:px-6 lg:px-8 py-12 md:py-16" style={{ overflow: 'visible' }}>
          <div className="container max-w-7xl mx-auto" style={{ overflow: 'visible' }}>
            <div className="max-w-2xl" style={{ overflow: 'visible' }}>
              <h2 className="text-3xl md:text-4xl font-light mb-4 tracking-tight">
                {banner.title}
              </h2>
              {banner.description && (
                <p className="text-lg md:text-xl text-gray-200 mb-6 max-w-xl">
                  {banner.description}
                </p>
              )}
              
              {/* Button with dropdown */}
              <div className="relative inline-block" style={{ zIndex: 1000 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsDropdownOpen(!isDropdownOpen)
                  }}
                  className="inline-flex items-center gap-2 text-base font-medium hover:gap-4 transition-all duration-300 cursor-pointer bg-transparent border-0"
                >
                  {banner.button_text || 'Kategorileri Keşfet'}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div 
                    className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg p-4 max-h-96 overflow-y-auto"
                    style={{ 
                      zIndex: 1001,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                      border: '2px solid #d1d5db'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-3">
                      {allCategories.map((category) => (
                        <div key={category.slug} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                          {/* Ana Kategori */}
                          <Link
                            href={`/kategori/${category.slug}`}
                            className="block text-sm font-bold text-gray-900 hover:text-black hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            {category.name}
                          </Link>
                          {/* Alt Kategoriler */}
                          <div className="ml-2 mt-1 space-y-1">
                            {category.subcategories.map((subcategory) => (
                              <Link
                                key={subcategory.href}
                                href={subcategory.href}
                                className="block text-sm text-gray-700 hover:text-black hover:bg-gray-50 px-3 py-1.5 rounded transition-colors"
                                onClick={() => setIsDropdownOpen(false)}
                              >
                                • {subcategory.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
