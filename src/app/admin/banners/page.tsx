'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ChevronDown, ChevronUp, Edit, Plus, Save, Trash2, X } from 'lucide-react'
import ImageUpload from '@/components/image-upload'

const HIDDEN_LAYOUT_LINK = 'internal:home-rows'

interface Banner {
  id: string
  title: string
  subtitle: string
  image: string
  link: string
  display_order: number
  is_active: boolean
}

const emptyBanner = (order: number): Partial<Banner> => ({
  title: '',
  subtitle: '',
  image: '',
  link: '/kategori/tirnak',
  display_order: order,
  is_active: true,
})

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      const response = await fetch('/api/banners', { cache: 'no-store' })
      const result = await response.json()
      if (result.success) {
        setBanners(
          (result.data || []).filter((banner: Banner) => banner.link !== HIDDEN_LAYOUT_LINK)
        )
      }
    } catch (error) {
      console.error('Error loading banners:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sorted = [...banners].sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))

  const handleSave = async () => {
    if (!editingBanner?.title?.trim() || !editingBanner.image?.trim() || !editingBanner.link?.trim()) {
      alert('Açıklama, görsel ve link zorunlu')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: editingBanner.title.trim(),
        subtitle: editingBanner.subtitle || '',
        image: editingBanner.image,
        link: editingBanner.link.trim(),
        display_order: editingBanner.display_order || sorted.length + 1,
        is_active: editingBanner.is_active ?? true,
      }
      const response = await fetch(isAddingNew ? '/api/banners' : `/api/banners/${editingBanner.id}`, {
        method: isAddingNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!result.success) {
        alert(result.error || 'Kaydedilemedi')
        return
      }
      setEditingBanner(null)
      setIsAddingNew(false)
      await loadBanners()
    } catch (error) {
      console.error('Error saving banner:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu banner silinsin mi?')) return
    const response = await fetch(`/api/banners/${id}`, { method: 'DELETE' })
    if (response.ok) await loadBanners()
  }

  const handleToggleActive = async (banner: Banner) => {
    await fetch(`/api/banners/${banner.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...banner, is_active: !banner.is_active }),
    })
    await loadBanners()
  }

  const move = async (index: number, direction: number) => {
    const next = index + direction
    if (next < 0 || next >= sorted.length) return
    const reordered = [...sorted]
    const [item] = reordered.splice(index, 1)
    reordered.splice(next, 0, item)
    await Promise.all(
      reordered.map((banner, order) =>
        fetch(`/api/banners/${banner.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...banner, display_order: order + 1 }),
        })
      )
    )
    await loadBanners()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <Link href="/admin" className="mb-3 inline-flex items-center text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Admin Paneli
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Kampanya Bannerları</h2>
          <p className="mt-1 text-sm text-gray-500">
            Ana sayfanın en üstündeki kayan görseller. Sıra, link ve yayında olma durumu buradan değişir.
            Aktif banner kalmazsa slider gizlenir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAddingNew(true)
            setEditingBanner(emptyBanner(sorted.length + 1))
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 md:mt-0"
        >
          <Plus className="h-4 w-4" />
          Yeni Banner
        </button>
      </div>

      {(editingBanner || isAddingNew) && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            {isAddingNew ? 'Yeni banner' : 'Bannerı düzenle'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Görsel açıklaması</label>
              <input
                type="text"
                value={editingBanner?.title || ''}
                onChange={(event) => setEditingBanner({ ...editingBanner, title: event.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Örn. Dubai Cat Eye koleksiyonu"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Görsel</label>
              <ImageUpload
                onUpload={(url) => setEditingBanner({ ...editingBanner, image: url })}
                currentImage={editingBanner?.image}
                folder="banners"
              />
              <input
                type="text"
                value={editingBanner?.image || ''}
                onChange={(event) => setEditingBanner({ ...editingBanner, image: event.target.value })}
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="veya görsel URL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tıklanınca gidilecek adres</label>
              <input
                type="text"
                value={editingBanner?.link || ''}
                onChange={(event) => setEditingBanner({ ...editingBanner, link: event.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="/kategori/tirnak"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editingBanner?.is_active ?? true}
                onChange={(event) => setEditingBanner({ ...editingBanner, is_active: event.target.checked })}
              />
              Yayında
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingBanner(null)
                  setIsAddingNew(false)
                }}
                className="inline-flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                <X className="h-4 w-4" />
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">Slider ({sorted.length})</h3>
        </div>
        {sorted.length === 0 ? (
          <p className="p-12 text-center text-gray-500">Henüz banner yok. Yeni banner ekleyin.</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {sorted.map((banner, index) => (
              <div key={banner.id} className="flex items-center gap-4 p-4 sm:p-6">
                <Image
                  src={banner.image || '/placeholder.png'}
                  alt={banner.title}
                  width={160}
                  height={54}
                  className="h-14 w-40 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{banner.title}</p>
                  <p className="truncate text-xs text-gray-500">{banner.link}</p>
                </div>
                <button type="button" onClick={() => move(index, -1)} className="rounded p-2 text-gray-500 hover:bg-gray-100" aria-label="Yukarı">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(index, 1)} className="rounded p-2 text-gray-500 hover:bg-gray-100" aria-label="Aşağı">
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(banner)}
                  className={`rounded px-3 py-1 text-xs font-medium ${banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
                >
                  {banner.is_active ? 'Yayında' : 'Gizli'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false)
                    setEditingBanner(banner)
                  }}
                  className="rounded p-2 text-gray-600 hover:bg-gray-100"
                  aria-label="Düzenle"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(banner.id)}
                  className="rounded p-2 text-red-600 hover:bg-red-50"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
