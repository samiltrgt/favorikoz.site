'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Package,
  Sparkles,
} from 'lucide-react'

interface Product {
  id: string
  name: string
  brand: string
  price: number
  image: string
  slug: string
}

interface OwnProductionItem {
  id: string
  product_id: string
  display_order: number
  is_active: boolean
  products: Product
}

export default function OwnProductionAdminPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [ownProducts, setOwnProducts] = useState<OwnProductionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [productsRes, ownRes] = await Promise.all([
        fetch('/api/products?scope=admin'),
        fetch('/api/own-production'),
      ])
      const productsData = await productsRes.json()
      const ownData = await ownRes.json()
      if (productsData.success) setAllProducts(productsData.data || [])
      if (ownData.success) setOwnProducts(ownData.data || [])
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
  const currentProductIds = ownProducts.map((op) => op.product_id)

  const addToOwn = async (productId: string) => {
    try {
      const res = await fetch('/api/own-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })
      if (res.ok) await loadData()
    } catch (e) {
      console.error('Error adding to own production:', e)
    }
  }

  const removeFromOwn = async (itemId: string) => {
    try {
      const res = await fetch(`/api/own-production/${itemId}`, { method: 'DELETE' })
      if (res.ok) await loadData()
    } catch (e) {
      console.error('Error removing:', e)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
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
                Exclusive Collection (Kendi Üretimimiz)
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Anasayfadaki &quot;Exclusive Collection&quot; bölümünde gösterilecek ürünleri seçin
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Seçili Ürünler ({ownProducts.length})
            </h3>
          </div>
          <div className="p-6">
            {ownProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz ürün eklenmemiş</h3>
                <p className="mt-1 text-sm text-gray-500">Sağ taraftan ürün seçerek ekleyebilirsiniz</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ownProducts
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((item) => {
                    const product = item.products
                    if (!product) return null
                    return (
                      <div
                        key={item.id}
                        className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-shrink-0">
                          <Image
                            src={product.image || '/placeholder.png'}
                            alt={product.name}
                            width={64}
                            height={64}
                            className="rounded-lg object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.brand}</p>
                          <p className="text-sm text-gray-900 font-medium">
                            ₺{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromOwn(item.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="Listeden çıkar"
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
            <h3 className="text-lg font-medium text-gray-900">Tüm Ürünler</h3>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ürün ara..."
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
                    onClick={() => !isSelected && addToOwn(product.id)}
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
                      <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" />
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
