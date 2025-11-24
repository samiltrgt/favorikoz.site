'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Save, Trash2, RefreshCw, Sparkles } from 'lucide-react'

interface HeroProductSlot {
  id?: string
  name: string
  description: string
  image: string
  link: string
  is_active: boolean
  slide_index: number
  slot_index: number
}

type SlotState = Record<string, HeroProductSlot>

const slides = [
  { index: 0, title: 'Slide 1', description: 'Giriş - markanın ana mesajı' },
  { index: 1, title: 'Slide 2', description: 'Kişisel bakım temalı' },
  { index: 2, title: 'Slide 3', description: 'İpek kirpik / güzellik odağı' },
]

const slotLabels = ['Sol Kart', 'Sağ Kart']

const defaultSlot = (slideIndex: number, slotIndex: number): HeroProductSlot => ({
  id: undefined,
  name: '',
  description: '',
  image: '',
  link: '',
  is_active: true,
  slide_index: slideIndex,
  slot_index: slotIndex,
})

export default function HeroProductsAdminPage() {
  const [slots, setSlots] = useState<SlotState>({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const slotKeys = useMemo(() => {
    const keys: string[] = []
    slides.forEach((slide) => {
      slotLabels.forEach((_, slotIndex) => {
        keys.push(`${slide.index}-${slotIndex}`)
      })
    })
    return keys
  }, [])

  useEffect(() => {
    loadSlots()
  }, [])

  const loadSlots = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/hero-products?scope=admin', {
        cache: 'no-store',
      })
      const result = await response.json()

      if (result.success) {
        const mapped: SlotState = {}
        slotKeys.forEach((key) => {
          const [slideIndex, slotIndex] = key.split('-').map(Number)
          mapped[key] = defaultSlot(slideIndex, slotIndex)
        })

        ;(result.data as HeroProductSlot[]).forEach((item) => {
          const key = `${item.slide_index}-${item.slot_index}`
          if (mapped[key]) {
            mapped[key] = {
              id: item.id,
              name: item.name,
              description: item.description || '',
              image: item.image,
              link: item.link || '',
              is_active: item.is_active,
              slide_index: item.slide_index,
              slot_index: item.slot_index,
            }
          }
        })

        setSlots(mapped)
      }
    } catch (error) {
      console.error('Failed to load hero products', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (key: string, field: keyof HeroProductSlot, value: string | boolean) => {
    setSlots((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }))
  }

  const handleSave = async (key: string) => {
    const slot = slots[key]
    if (!slot) return

    setSavingKey(key)
    try {
      const body = {
        name: slot.name,
        description: slot.description,
        image: slot.image,
        link: slot.link,
        slide_index: slot.slide_index,
        slot_index: slot.slot_index,
        is_active: slot.is_active,
      }

      const response = await fetch(
        slot.id ? `/api/hero-products/${slot.id}` : '/api/hero-products',
        {
          method: slot.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        throw new Error('Kaydedilemedi')
      }

      await loadSlots()
    } catch (error) {
      console.error('Failed to save hero product', error)
    } finally {
      setSavingKey(null)
    }
  }

  const handleClear = async (key: string) => {
    const slot = slots[key]
    if (!slot) return

    if (slot.id) {
      try {
        setSavingKey(key)
        await fetch(`/api/hero-products/${slot.id}`, { method: 'DELETE' })
        await loadSlots()
      } finally {
        setSavingKey(null)
      }
    } else {
      setSlots((prev) => ({
        ...prev,
        [key]: defaultSlot(slot.slide_index, slot.slot_index),
      }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto" />
          <p className="text-sm text-gray-600">Hero ürünleri yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Hero Bölümü</p>
          <h1 className="text-2xl font-semibold text-gray-900">Slide Ürün Kartları</h1>
          <p className="text-sm text-gray-500 mt-1">
          Her slide için iki kart tanımlayın. Görsel, metin ve linkleri buradan güncelleyebilirsiniz.
          </p>
        </div>
        <button
          onClick={loadSlots}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      <div className="space-y-8">
        {slides.map((slide) => (
          <div key={slide.index} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{slide.title}</h2>
                <p className="text-sm text-gray-500">{slide.description}</p>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
              {slotLabels.map((label, slotIndex) => {
                const key = `${slide.index}-${slotIndex}`
                const slot = slots[key] ?? defaultSlot(slide.index, slotIndex)
                const hasContent = slot.name || slot.image
                const isSaving = savingKey === key

                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-4 shadow-sm transition ${
                      hasContent ? 'border-gray-200' : 'border-dashed border-gray-300'
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">Slide #{slide.index + 1} • Slot #{slotIndex + 1}</p>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={slot.is_active}
                          onChange={(e) => handleInputChange(key, 'is_active', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        Aktif
                      </label>
                    </div>

                    <div className="mb-4">
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-50">
                        {slot.image ? (
                          <Image
                            src={slot.image}
                            alt={slot.name || 'Hero product'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400 text-sm">
                            Görsel URL ekleyin
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Görsel URL</label>
                        <input
                          type="text"
                          value={slot.image}
                          onChange={(e) => handleInputChange(key, 'image', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                          placeholder="https://..."
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Başlık</label>
                        <input
                          type="text"
                          value={slot.name}
                          onChange={(e) => handleInputChange(key, 'name', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                          placeholder="Ürün adı"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Kısa Açıklama</label>
                        <textarea
                          value={slot.description}
                          onChange={(e) => handleInputChange(key, 'description', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                          rows={3}
                          placeholder="Kısa açıklama metni"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Link</label>
                        <input
                          type="text"
                          value={slot.link}
                          onChange={(e) => handleInputChange(key, 'link', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                          placeholder="/urun/..."
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <button
                        onClick={() => handleSave(key)}
                        disabled={isSaving}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                      >
                        {isSaving ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Kaydediliyor...
                          </span>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Kaydet
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleClear(key)}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


