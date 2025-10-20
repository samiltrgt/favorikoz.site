'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Eye, Upload, Save, X } from 'lucide-react'

interface Banner {
  id: string
  title: string
  subtitle: string
  image: string
  link: string
  isActive: boolean
  position: 'hero' | 'featured' | 'category'
  order: number
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([
    {
      id: '1',
      title: 'Yeni Koleksiyon',
      subtitle: 'Premium güzellik ürünleri',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=400&fit=crop',
      link: '/yeni-koleksiyon',
      isActive: true,
      position: 'hero',
      order: 1
    },
    {
      id: '2',
      title: 'Çok Satanlar',
      subtitle: 'En popüler ürünlerimiz',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=400&fit=crop',
      link: '/cok-satanlar',
      isActive: true,
      position: 'featured',
      order: 2
    },
    {
      id: '3',
      title: 'Protez Tırnak',
      subtitle: 'Profesyonel ürünler',
      image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=400&fit=crop',
      link: '/kategori/protez-tirnak',
      isActive: false,
      position: 'category',
      order: 3
    }
  ])

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editingBanner, setEditingBanner] = useState<Partial<Banner>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setIsEditing(banner.id)
  }

  const handleSave = () => {
    if (isAddingNew) {
      const newBanner: Banner = {
        id: Date.now().toString(),
        title: editingBanner.title || '',
        subtitle: editingBanner.subtitle || '',
        image: editingBanner.image || '',
        link: editingBanner.link || '',
        isActive: editingBanner.isActive || false,
        position: editingBanner.position || 'hero',
        order: editingBanner.order || banners.length + 1
      }
      setBanners([...banners, newBanner])
      setIsAddingNew(false)
    } else {
      setBanners(banners.map(banner => 
        banner.id === isEditing ? { ...banner, ...editingBanner } : banner
      ))
      setIsEditing(null)
    }
    setEditingBanner({})
  }

  const handleCancel = () => {
    setIsEditing(null)
    setIsAddingNew(false)
    setEditingBanner({})
  }

  const handleDelete = (id: string) => {
    if (confirm('Bu bannerı silmek istediğinizden emin misiniz?')) {
      setBanners(banners.filter(banner => banner.id !== id))
    }
  }

  const handleToggleActive = (id: string) => {
    setBanners(banners.map(banner => 
      banner.id === id ? { ...banner, isActive: !banner.isActive } : banner
    ))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setEditingBanner(prev => ({ ...prev, image: imageUrl }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Banner Yönetimi
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Ana sayfa ve kategori bannerlarını yönetin
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <button
            onClick={() => {
              setIsAddingNew(true)
              setEditingBanner({})
            }}
            className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Banner
          </button>
        </div>
      </div>

      {/* Banners List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            {banners.map((banner) => (
              <div key={banner.id} className="border border-gray-200 rounded-lg p-6">
                {isEditing === banner.id || (isAddingNew && banner.id === 'new') ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Başlık
                        </label>
                        <input
                          type="text"
                          value={editingBanner.title || ''}
                          onChange={(e) => setEditingBanner(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                          placeholder="Banner başlığı"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alt Başlık
                        </label>
                        <input
                          type="text"
                          value={editingBanner.subtitle || ''}
                          onChange={(e) => setEditingBanner(prev => ({ ...prev, subtitle: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                          placeholder="Banner alt başlığı"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Link
                        </label>
                        <input
                          type="text"
                          value={editingBanner.link || ''}
                          onChange={(e) => setEditingBanner(prev => ({ ...prev, link: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                          placeholder="/sayfa-adi"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pozisyon
                        </label>
                        <select
                          value={editingBanner.position || 'hero'}
                          onChange={(e) => setEditingBanner(prev => ({ ...prev, position: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        >
                          <option value="hero">Ana Sayfa Hero</option>
                          <option value="featured">Öne Çıkan</option>
                          <option value="category">Kategori</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Görsel
                      </label>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                          />
                        </div>
                        {editingBanner.image && (
                          <img
                            src={editingBanner.image}
                            alt="Preview"
                            className="h-20 w-32 object-cover rounded"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingBanner.isActive || false}
                        onChange={(e) => setEditingBanner(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Aktif
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-700"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Kaydet
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0">
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="h-20 w-32 object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {banner.title}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {banner.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{banner.subtitle}</p>
                      <p className="text-xs text-gray-400">Pozisyon: {banner.position} • Link: {banner.link}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(banner)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Düzenle"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(banner.id)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title={banner.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                      >
                        <Eye className={`h-4 w-4 ${banner.isActive ? 'text-green-500' : 'text-gray-400'}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isAddingNew && (
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Başlık
                      </label>
                      <input
                        type="text"
                        value={editingBanner.title || ''}
                        onChange={(e) => setEditingBanner(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        placeholder="Banner başlığı"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alt Başlık
                      </label>
                      <input
                        type="text"
                        value={editingBanner.subtitle || ''}
                        onChange={(e) => setEditingBanner(prev => ({ ...prev, subtitle: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        placeholder="Banner alt başlığı"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link
                      </label>
                      <input
                        type="text"
                        value={editingBanner.link || ''}
                        onChange={(e) => setEditingBanner(prev => ({ ...prev, link: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        placeholder="/sayfa-adi"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pozisyon
                      </label>
                      <select
                        value={editingBanner.position || 'hero'}
                        onChange={(e) => setEditingBanner(prev => ({ ...prev, position: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      >
                        <option value="hero">Ana Sayfa Hero</option>
                        <option value="featured">Öne Çıkan</option>
                        <option value="category">Kategori</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Görsel
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                        />
                      </div>
                      {editingBanner.image && (
                        <img
                          src={editingBanner.image}
                          alt="Preview"
                          className="h-20 w-32 object-cover rounded"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingBanner.isActive || false}
                      onChange={(e) => setEditingBanner(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Aktif
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
