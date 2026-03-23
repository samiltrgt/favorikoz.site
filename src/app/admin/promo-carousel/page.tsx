'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, Trash2, Save, RefreshCw } from 'lucide-react'
import ImageUpload from '@/components/image-upload'

interface PromoCarouselItem {
  id?: string
  title: string
  description: string
  image: string
  image_mobile?: string
  link: string
  button_text: string
  position: string
  is_active: boolean
  display_order: number
}

const emptyItem = (order: number): PromoCarouselItem => ({
  title: '',
  description: '',
  image: '',
  image_mobile: '',
  link: '/kategori/tirnak',
  button_text: 'Urunleri Gor',
  position: 'carousel',
  is_active: true,
  display_order: order,
})

export default function PromoCarouselAdminPage() {
  const [items, setItems] = useState<PromoCarouselItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | number | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/promo-banners?scope=admin&position=carousel', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        const data = (json.data || []) as PromoCarouselItem[]
        setItems(data.length > 0 ? data : [emptyItem(1), emptyItem(2), emptyItem(3)])
      }
    } catch (e) {
      console.error('Promo carousel load error:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (index: number, field: keyof PromoCarouselItem, value: string | boolean | number) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addNew = () => {
    setItems((prev) => [...prev, emptyItem(prev.length + 1)])
  }

  const saveItem = async (index: number) => {
    const item = items[index]
    if (!item.title || !item.image) {
      alert('Baslik ve gorsel zorunlu')
      return
    }
    setSavingId(item.id || index)
    try {
      const body = {
        ...item,
        position: 'carousel',
        display_order: index + 1,
      }
      const res = await fetch(item.id ? `/api/promo-banners/${item.id}` : '/api/promo-banners', {
        method: item.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Kayit basarisiz')
      }
      await loadItems()
    } catch (e: any) {
      alert(e?.message || 'Kaydedilemedi')
    } finally {
      setSavingId(null)
    }
  }

  const removeItem = async (index: number) => {
    const item = items[index]
    if (!item.id) {
      setItems((prev) => prev.filter((_, i) => i !== index))
      return
    }
    try {
      const res = await fetch(`/api/promo-banners/${item.id}`, { method: 'DELETE' })
      if (res.ok) await loadItems()
    } catch (e) {
      console.error('Promo carousel delete error:', e)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
            <ArrowLeft className="w-4 h-4" />
            Admin Paneli
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Promo Carousel (3 Sayfa)</h1>
          <p className="text-sm text-gray-500">PromoBannerCarousel bolumundeki sayfalari yonetin.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadItems} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
          <button onClick={addNew} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800">
            <Plus className="w-4 h-4" />
            Sayfa Ekle
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {items.map((item, index) => (
          <div key={item.id || `new-${index}`} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Sayfa #{index + 1}</h2>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={item.is_active}
                  onChange={(e) => handleChange(index, 'is_active', e.target.checked)}
                />
                Aktif
              </label>
            </div>

            {item.image && (
              <div className="relative w-full aspect-[1910/250] rounded-lg overflow-hidden border border-gray-200">
                <Image src={item.image} alt={item.title || 'preview'} fill className="object-cover" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-700">Baslik</label>
                <input
                  value={item.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Link</label>
                <input
                  value={item.link}
                  onChange={(e) => handleChange(index, 'link', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-700">Aciklama</label>
              <textarea
                value={item.description}
                onChange={(e) => handleChange(index, 'description', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-700">Masaustu Gorsel URL</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={item.image}
                    onChange={(e) => handleChange(index, 'image', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <ImageUpload onUpload={(url) => handleChange(index, 'image', url)} folder="banners" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700">Mobil Gorsel URL</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={item.image_mobile || ''}
                    onChange={(e) => handleChange(index, 'image_mobile', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <ImageUpload onUpload={(url) => handleChange(index, 'image_mobile', url)} folder="banners" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => saveItem(index)}
                disabled={savingId === (item.id || index)}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                Kaydet
              </button>
              <button onClick={() => removeItem(index)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

