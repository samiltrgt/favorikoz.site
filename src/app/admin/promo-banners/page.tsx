'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, RefreshCw, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ImageUpload from '@/components/image-upload'

interface PromoBanner {
  id?: string
  title: string
  description: string
  image: string
  link: string
  button_text: string
  position: 'top' | 'bottom'
  is_active: boolean
  display_order: number
}

const positions = [
  { value: 'top', label: 'Üst Banner (Features Section\'dan sonra)' },
  { value: 'bottom', label: 'Alt Banner (HomeBanners\'dan sonra)' },
]

export default function PromoBannersPage() {
  const [banners, setBanners] = useState<Record<'top' | 'bottom', PromoBanner | null>>({
    top: null,
    bottom: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [savingPosition, setSavingPosition] = useState<'top' | 'bottom' | null>(null)

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/promo-banners?scope=admin', {
        cache: 'no-store',
      })
      const result = await response.json()

      if (result.success) {
        const loaded: Record<'top' | 'bottom', PromoBanner | null> = {
          top: null,
          bottom: null,
        }

        ;(result.data as PromoBanner[]).forEach((banner) => {
          if (banner.position === 'top' || banner.position === 'bottom') {
            loaded[banner.position] = banner
          }
        })

        setBanners(loaded)
      }
    } catch (error) {
      console.error('Failed to load promo banners', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (
    position: 'top' | 'bottom',
    field: keyof PromoBanner,
    value: string | boolean
  ) => {
    setBanners((prev) => ({
      ...prev,
      [position]: {
        ...prev[position] || {
          title: '',
          description: '',
          image: '',
          link: '/tum-urunler',
          button_text: 'Tüm Ürünleri Keşfet',
          position,
          is_active: true,
          display_order: position === 'top' ? 1 : 2,
        },
        [field]: value,
      },
    }))
  }

  const handleSave = async (position: 'top' | 'bottom') => {
    const banner = banners[position]
    if (!banner || !banner.title || !banner.image) {
      alert('Lütfen başlık ve görsel alanlarını doldurun')
      return
    }

    setSavingPosition(position)
    try {
      const body = {
        title: banner.title,
        description: banner.description || '',
        image: banner.image,
        link: banner.link || '/tum-urunler',
        button_text: banner.button_text || 'Tüm Ürünleri Keşfet',
        position: banner.position,
        is_active: banner.is_active,
        display_order: banner.display_order,
      }

      const response = await fetch(
        banner.id ? `/api/promo-banners/${banner.id}` : '/api/promo-banners',
        {
          method: banner.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Kaydedilemedi')
      }

      const savedData = await response.json()
      console.log('✅ Promo banner saved:', savedData)

      await loadBanners()
      alert('Banner başarıyla kaydedildi!')
    } catch (error: any) {
      console.error('Failed to save promo banner', error)
      alert('Hata: ' + (error.message || 'Kaydedilemedi'))
    } finally {
      setSavingPosition(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto" />
          <p className="text-sm text-gray-600">Banner'lar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Admin Paneli
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Promo Banner Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ana sayfadaki promo banner'ları yönetin
          </p>
        </div>
        <button
          onClick={loadBanners}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {positions.map((pos) => {
          const banner = banners[pos.value as 'top' | 'bottom'] || {
            title: '',
            description: '',
            image: '',
            link: '/tum-urunler',
            button_text: 'Tüm Ürünleri Keşfet',
            position: pos.value as 'top' | 'bottom',
            is_active: true,
            display_order: pos.value === 'top' ? 1 : 2,
          }
          const isSaving = savingPosition === pos.value

          return (
            <div
              key={pos.value}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">{pos.label}</h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Preview */}
                {banner.image && (
                  <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    <Image
                      src={banner.image}
                      alt={banner.title || 'Banner preview'}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Görsel URL *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={banner.image}
                        onChange={(e) =>
                          handleInputChange(pos.value as 'top' | 'bottom', 'image', e.target.value)
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                        placeholder="https://..."
                      />
                      <ImageUpload
                        onUpload={(url) =>
                          handleInputChange(pos.value as 'top' | 'bottom', 'image', url)
                        }
                        folder="banners"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlık *
                    </label>
                    <input
                      type="text"
                      value={banner.title}
                      onChange={(e) =>
                        handleInputChange(pos.value as 'top' | 'bottom', 'title', e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="Premium Ürünlerle Güzelliğinizi Keşfedin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={banner.description}
                      onChange={(e) =>
                        handleInputChange(
                          pos.value as 'top' | 'bottom',
                          'description',
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      rows={2}
                      placeholder="Profesyonel kalitede ürünler ve ekipmanlarla kendinizi şımartın"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link
                    </label>
                    <input
                      type="text"
                      value={banner.link}
                      onChange={(e) =>
                        handleInputChange(pos.value as 'top' | 'bottom', 'link', e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="/tum-urunler"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buton Metni
                    </label>
                    <input
                      type="text"
                      value={banner.button_text}
                      onChange={(e) =>
                        handleInputChange(
                          pos.value as 'top' | 'bottom',
                          'button_text',
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="Tüm Ürünleri Keşfet"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={banner.is_active}
                      onChange={(e) =>
                        handleInputChange(
                          pos.value as 'top' | 'bottom',
                          'is_active',
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <label className="text-sm text-gray-700">Aktif</label>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={() => handleSave(pos.value as 'top' | 'bottom')}
                  disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Kaydet
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

