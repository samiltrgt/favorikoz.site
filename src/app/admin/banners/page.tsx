'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, ArrowLeft, Save, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Banner {
  id: string
  title: string
  subtitle: string
  image: string
  link: string
  display_order: number
  is_active: boolean
}

interface HeroProduct {
  id: string
  name: string
  description: string
  image: string
  link: string
  display_order: number
  is_active: boolean
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [heroProducts, setHeroProducts] = useState<HeroProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingHeroProduct, setEditingHeroProduct] = useState<Partial<HeroProduct> | null>(null)
  const [isAddingHeroProduct, setIsAddingHeroProduct] = useState(false)

  useEffect(() => {
    loadBanners()
    loadHeroProducts()
  }, [])

  const loadBanners = async () => {
    try {
      const response = await fetch('/api/banners')
      const result = await response.json()
      if (result.success) {
        setBanners(result.data || [])
      }
    } catch (error) {
      console.error('Error loading banners:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadHeroProducts = async () => {
    try {
      const response = await fetch('/api/hero-products')
      const result = await response.json()
      if (result.success) {
        setHeroProducts(result.data || [])
      }
    } catch (error) {
      console.error('Error loading hero products:', error)
    }
  }

  const handleSave = async () => {
    try {
      if (isAddingNew) {
        // Create new banner
        const response = await fetch('/api/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editingBanner?.title || '',
            subtitle: editingBanner?.subtitle || '',
            image: editingBanner?.image || '',
            link: editingBanner?.link || '',
            display_order: editingBanner?.display_order || banners.length + 1,
            is_active: editingBanner?.is_active ?? true,
          }),
        })
        
        if (response.ok) {
          await loadBanners()
          setIsAddingNew(false)
          setEditingBanner(null)
        }
      } else if (editingBanner?.id) {
        // Update existing banner
        const response = await fetch(`/api/banners/${editingBanner.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingBanner),
        })
        
        if (response.ok) {
          await loadBanners()
          setEditingBanner(null)
        }
      }
    } catch (error) {
      console.error('Error saving banner:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu banner\'ı silmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      const response = await fetch(`/api/banners/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setBanners(prev => prev.filter(b => b.id !== id))
      }
    } catch (error) {
      console.error('Error deleting banner:', error)
    }
  }

  const handleToggleActive = async (banner: Banner) => {
    try {
      const response = await fetch(`/api/banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...banner,
          is_active: !banner.is_active,
        }),
      })
      
      if (response.ok) {
        await loadBanners()
      }
    } catch (error) {
      console.error('Error toggling banner:', error)
    }
  }

  const handleSaveHeroProduct = async () => {
    try {
      if (isAddingHeroProduct) {
        const response = await fetch('/api/hero-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingHeroProduct?.name || '',
            description: editingHeroProduct?.description || '',
            image: editingHeroProduct?.image || '',
            link: editingHeroProduct?.link || '',
            display_order: editingHeroProduct?.display_order || heroProducts.length + 1,
            is_active: editingHeroProduct?.is_active ?? true,
          }),
        })
        
        if (response.ok) {
          await loadHeroProducts()
          setIsAddingHeroProduct(false)
          setEditingHeroProduct(null)
        }
      } else if (editingHeroProduct?.id) {
        const response = await fetch(`/api/hero-products/${editingHeroProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingHeroProduct),
        })
        
        if (response.ok) {
          await loadHeroProducts()
          setEditingHeroProduct(null)
        }
      }
    } catch (error) {
      console.error('Error saving hero product:', error)
    }
  }

  const handleDeleteHeroProduct = async (id: string) => {
    if (!confirm('Bu hero product\'ı silmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      const response = await fetch(`/api/hero-products/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await loadHeroProducts()
      }
    } catch (error) {
      console.error('Error deleting hero product:', error)
    }
  }

  const handleToggleHeroProductActive = async (product: HeroProduct) => {
    try {
      const response = await fetch(`/api/hero-products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          is_active: !product.is_active,
        }),
      })
      
      if (response.ok) {
        await loadHeroProducts()
      }
    } catch (error) {
      console.error('Error toggling hero product:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <Link href="/admin" className="mr-4 p-2 text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Banner Yönetimi
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Ana sayfa banner'larını yönetin
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <button
            type="button"
            onClick={() => {
              setIsAddingNew(true)
              setEditingBanner({ is_active: true, display_order: banners.length + 1 })
            }}
            className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Yeni Banner
          </button>
        </div>
      </div>

      {/* Edit/Add Form */}
      {(editingBanner || isAddingNew) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isAddingNew ? 'Yeni Banner' : 'Banner Düzenle'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Başlık</label>
              <input
                type="text"
                value={editingBanner?.title || ''}
                onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-black focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Alt Başlık</label>
              <input
                type="text"
                value={editingBanner?.subtitle || ''}
                onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-black focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Görsel URL</label>
              <input
                type="text"
                value={editingBanner?.image || ''}
                onChange={(e) => setEditingBanner({ ...editingBanner, image: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-black focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Link</label>
              <input
                type="text"
                value={editingBanner?.link || ''}
                onChange={(e) => setEditingBanner({ ...editingBanner, link: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-black focus:ring-black"
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingBanner?.is_active ?? true}
                  onChange={(e) => setEditingBanner({ ...editingBanner, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm font-medium text-gray-700">Aktif</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                <Save className="h-4 w-4" />
                Kaydet
              </button>
              <button
                onClick={() => {
                  setEditingBanner(null)
                  setIsAddingNew(false)
                }}
                className="inline-flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
              >
                <X className="h-4 w-4" />
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banners List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Banner'lar ({banners.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {banners.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Henüz banner eklenmemiş.
            </div>
          ) : (
            banners
              .sort((a, b) => a.display_order - b.display_order)
              .map((banner) => (
                <div key={banner.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center gap-6">
                    <div className="flex-shrink-0">
                      <Image
                        src={banner.image || '/placeholder.png'}
                        alt={banner.title}
                        width={120}
                        height={60}
                        className="rounded object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{banner.title}</p>
                      <p className="text-sm text-gray-500">{banner.subtitle}</p>
                      <p className="text-xs text-gray-400 truncate">{banner.link}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(banner)}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          banner.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {banner.is_active ? 'Aktif' : 'Pasif'}
                      </button>
                      <button
                        onClick={() => setEditingBanner(banner)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Hero Products Section */}
      <div className="mt-12">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Hero Section Ürünleri</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ana sayfa hero section'daki ürün kartlarını yönetin
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAddingHeroProduct(true)
              setEditingHeroProduct({ is_active: true, display_order: heroProducts.length + 1 })
            }}
            className="mt-4 md:mt-0 inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Yeni Ürün Kartı
          </button>
        </div>

        {/* Hero Product Edit/Add Form */}
        {(editingHeroProduct || isAddingHeroProduct) && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isAddingHeroProduct ? 'Yeni Ürün Kartı' : 'Ürün Kartı Düzenle'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ürün Adı</label>
                <input
                  type="text"
                  value={editingHeroProduct?.name || ''}
                  onChange={(e) => setEditingHeroProduct({ ...editingHeroProduct, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-black focus:ring-black"
                  placeholder="Örn: Saç Fiberi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                <input
                  type="text"
                  value={editingHeroProduct?.description || ''}
                  onChange={(e) => setEditingHeroProduct({ ...editingHeroProduct, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-black focus:ring-black"
                  placeholder="Örn: Doğal hacim ve kaplama"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Görsel URL</label>
                <input
                  type="text"
                  value={editingHeroProduct?.image || ''}
                  onChange={(e) => setEditingHeroProduct({ ...editingHeroProduct, image: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-black focus:ring-black"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Link (Opsiyonel)</label>
                <input
                  type="text"
                  value={editingHeroProduct?.link || ''}
                  onChange={(e) => setEditingHeroProduct({ ...editingHeroProduct, link: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-black focus:ring-black"
                  placeholder="/kategori/sac-bakimi"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingHeroProduct?.is_active ?? true}
                    onChange={(e) => setEditingHeroProduct({ ...editingHeroProduct, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm font-medium text-gray-700">Aktif</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveHeroProduct}
                  className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  <Save className="h-4 w-4" />
                  Kaydet
                </button>
                <button
                  onClick={() => {
                    setEditingHeroProduct(null)
                    setIsAddingHeroProduct(false)
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                >
                  <X className="h-4 w-4" />
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Products List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Ürün Kartları ({heroProducts.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {heroProducts.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                Henüz ürün kartı eklenmemiş.
              </div>
            ) : (
              heroProducts
                .sort((a, b) => a.display_order - b.display_order)
                .map((product) => (
                  <div key={product.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center gap-6">
                      <div className="flex-shrink-0">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={120}
                            height={120}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-[120px] h-[120px] bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-gray-400">Görsel Yok</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.description}</p>
                        <p className="text-xs text-gray-400 truncate">{product.link || 'Link yok'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleHeroProductActive(product)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            product.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {product.is_active ? 'Aktif' : 'Pasif'}
                        </button>
                        <button
                          onClick={() => setEditingHeroProduct(product)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteHeroProduct(product.id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
