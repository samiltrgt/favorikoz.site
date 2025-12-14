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

// Alt kategori yapısı
const categorySubcategories: { [key: string]: Array<{ name: string; href: string }> } = {
  'tirnak': [
    { name: 'Jeller', href: '/kategori/tirnak/jeller' },
    { name: 'Cihazlar', href: '/kategori/tirnak/cihazlar' },
    { name: 'Freze Uçları', href: '/kategori/tirnak/freze-uclari' },
    { name: 'Kalıcı Oje', href: '/kategori/tirnak/kalici-oje' },
    { name: 'Protez Tırnak Malzemeleri', href: '/kategori/tirnak/protez-tirnak-malzemeleri' },
  ],
  'sac-bakimi': [
    { name: 'Saç Bakım', href: '/kategori/sac-bakimi/sac-bakim' },
    { name: 'Saç Topik', href: '/kategori/sac-bakimi/sac-topik' },
    { name: 'Saç Şekillendiriciler', href: '/kategori/sac-bakimi/sac-sekillendiriciler' },
    { name: 'Saç Fırçası ve Tarak', href: '/kategori/sac-bakimi/sac-fircasi-ve-tarak' },
  ],
  'kisisel-bakim': [
    { name: 'Kişisel Bakım', href: '/kategori/kisisel-bakim/kisisel-bakim' },
    { name: 'Cilt Bakımı', href: '/kategori/kisisel-bakim/cilt-bakimi' },
  ],
  'ipek-kirpik': [
    { name: 'İpek Kirpikler', href: '/kategori/ipek-kirpik/ipek-kirpikler' },
    { name: 'Diğer İpek Kirpik Ürünleri', href: '/kategori/ipek-kirpik/diger-ipek-kirpik-urunleri' },
  ],
  'kuafor-malzemeleri': [
    { name: 'Tıraş Makineleri', href: '/kategori/kuafor-malzemeleri/tiras-makineleri' },
    { name: 'Diğer Kuaför Malzemeleri', href: '/kategori/kuafor-malzemeleri/diger-kuafor-malzemeleri' },
  ],
}

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

        console.log(`🎯 Promo Banner [${position}] API Response:`, {
          success: result.success,
          dataLength: result.data?.length,
          data: result.data
        })

        if (result.success && result.data && result.data.length > 0) {
          const bannerData = result.data[0]
          console.log(`✅ Promo Banner [${position}] loaded:`, bannerData)
          setBanner(bannerData)
        } else {
          console.warn(`⚠️ No promo banner found for position: ${position}`)
        }
      } catch (error) {
        console.error(`❌ Error loading promo banner [${position}]:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    loadBanner()

    // Reload every 10 seconds to catch updates
    const interval = setInterval(loadBanner, 10000)
    return () => clearInterval(interval)
  }, [position])

  if (isLoading) {
    return null
  }

  if (!banner) {
    console.log(`ℹ️ Promo Banner [${position}] not found or not active`)
    return null
  }

  // Kategori linkini kontrol et (örn: /kategori/tirnak)
  const categoryMatch = banner.link?.match(/\/kategori\/([^\/]+)/)
  const categorySlug = categoryMatch ? categoryMatch[1] : null
  const subcategories = categorySlug ? categorySubcategories[categorySlug] : null
  const hasDropdown = !!subcategories && subcategories.length > 0

  return (
    <section className="py-8 bg-white border-t border-gray-100 relative z-10">
      <div className="group relative block w-full overflow-visible bg-gradient-to-r from-gray-800 to-gray-700 text-white hover:shadow-2xl transition-all duration-300">
        {/* Background Image */}
        {banner.image && (
          <div className="absolute inset-0 opacity-40">
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
              
              {/* Button with dropdown */}
              <div className="relative inline-flex items-center z-50">
                <Link
                  href={banner.link || '/tum-urunler'}
                  className="inline-flex items-center gap-2 text-base font-medium hover:gap-4 transition-all duration-300"
                >
                  {banner.button_text || 'Tüm Ürünleri Keşfet'}
                </Link>
                {hasDropdown && (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsDropdownOpen(!isDropdownOpen)
                      }}
                      className="ml-2 p-1 hover:bg-white/20 rounded transition-colors relative z-50"
                      aria-label="Alt kategorileri göster"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <>
                        {/* Backdrop to close on outside click */}
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setIsDropdownOpen(false)}
                        />
                        <div 
                          className="absolute top-full left-0 mt-2 w-64 bg-white shadow-xl border border-gray-200 rounded-lg p-4 z-[60] animate-slide-in-up"
                          onMouseLeave={() => setIsDropdownOpen(false)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="grid grid-cols-1 gap-1">
                            {subcategories.map((subcategory, index) => (
                              <Link
                                key={subcategory.href}
                                href={subcategory.href}
                                className="text-sm text-gray-700 hover:text-black hover:bg-gray-50 active:scale-95 px-3 py-2.5 rounded transition-all duration-200 animate-fade-in-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                                onClick={() => setIsDropdownOpen(false)}
                              >
                                {subcategory.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
                {!hasDropdown && (
                  <span className="ml-2 transform transition-transform group-hover:translate-x-1">→</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

