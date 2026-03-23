'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, Trash2, Search, Package, Images } from 'lucide-react'

interface Product {
  id: string
  name: string
  brand: string
  price: number
  image: string
}

interface ScrollHeroItem {
  id: string
  product_id: string | null
  image_url?: string | null
  display_order: number
  is_active: boolean
  image?: string | null
  products: Product | null
}

export default function ScrollHeroCardsAdminPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [heroItems, setHeroItems] = useState<ScrollHeroItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [productsRes, heroRes] = await Promise.all([
        fetch('/api/products?scope=admin'),
        fetch('/api/scroll-hero-products?scope=admin'),
      ])
      const productsData = await productsRes.json()
      const heroData = await heroRes.json()
      if (productsData.success) setAllProducts(productsData.data || [])
      if (heroData.success) setHeroItems(heroData.data || [])
    } catch (e) {
      console.error('Error loading data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  const currentProductIds = heroItems.map((item) => item.product_id).filter(Boolean) as string[]

  const addToHero = async (productId: string) => {
    try {
      const res = await fetch('/api/scroll-hero-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })
      if (res.ok) await loadData()
    } catch (e) {
      console.error('Error adding scroll hero item:', e)
    }
  }

  const addImageToHero = async () => {
    const imageUrl = imageUrlInput.trim()
    if (!imageUrl) return
    try {
      const res = await fetch('/api/scroll-hero-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      })
      if (res.ok) {
        setImageUrlInput('')
        await loadData()
      }
    } catch (e) {
      console.error('Error adding image to scroll hero:', e)
    }
  }

  const removeFromHero = async (itemId: string) => {
    try {
      const res = await fetch(`/api/scroll-hero-products/${itemId}`, { method: 'DELETE' })
      if (res.ok) await loadData()
    } catch (e) {
      console.error('Error removing scroll hero item:', e)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">Yukleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <Link href="/admin" className="mr-4 p-2 text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Scroll Hero Kartlari
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Anasayfadaki scroll hero kart gorsellerini buradan yonetebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Secili Urunler ({heroItems.length})</h3>
          </div>
          <div className="p-6">
            {heroItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Henuz urun eklenmemis</h3>
                <p className="mt-1 text-sm text-gray-500">Sag taraftan urun secerek ekleyebilirsiniz</p>
              </div>
            ) : (
              <div className="space-y-4">
                {heroItems
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((item) => {
                    const product = item.products
                    const cardImage = product?.image || item.image_url || item.image || '/placeholder.png'
                    const cardName = product?.name || 'Ozel gorsel'
                    const cardBrand = product?.brand || 'Manuel eklenen gorsel'
                    return (
                      <div
                        key={item.id}
                        className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-shrink-0">
                          <Image
                            src={cardImage}
                            alt={cardName}
                            width={64}
                            height={64}
                            className="rounded-lg object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{cardName}</p>
                          <p className="text-sm text-gray-500">{cardBrand}</p>
                          {product?.price != null && (
                            <p className="text-sm text-gray-900 font-medium">
                              ₺{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromHero(item.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="Listeden cikar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Tum Urunler</h3>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Veya direkt gorsel URL ekle (https://...)"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <button
                onClick={addImageToHero}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
              >
                Gorsel Ekle
              </button>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Urun ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {filteredProducts.map((product) => {
                const isSelected = currentProductIds.includes(product.id)
                return (
                  <div
                    key={product.id}
                    className={`flex items-center space-x-4 p-3 rounded-lg border ${
                      isSelected
                        ? 'bg-gray-50 border-gray-200 opacity-50'
                        : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                    }`}
                    onClick={() => !isSelected && addToHero(product.id)}
                  >
                    <div className="flex-shrink-0">
                      <Image
                        src={product.image || '/placeholder.png'}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="rounded object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.brand}</p>
                    </div>
                    {isSelected ? (
                      <Images className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Plus className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

