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
  Star
} from 'lucide-react'

interface Product {
  id: string
  name: string
  brand: string
  price: number
  image: string
  is_best_seller: boolean
  is_new: boolean
}

interface FeaturedProduct {
  id: string
  product_id: string
  display_order: number
  is_active: boolean
  products: Product
}

export default function FeaturedProductsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load products and featured products from API
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load all products
      const productsRes = await fetch('/api/products')
      const productsData = await productsRes.json()
      if (productsData.success) {
        setAllProducts(productsData.data || [])
      }

      // Load featured products
      const featuredRes = await fetch('/api/featured-products')
      const featuredData = await featuredRes.json()
      if (featuredData.success) {
        setFeaturedProducts(featuredData.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter products based on search
  const filteredProducts = allProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Get current featured product IDs
  const currentProductIds = featuredProducts.map(fp => fp.product_id)

  // Add product to featured
  const addToFeatured = async (productId: string) => {
    try {
      const newOrder = Math.max(...featuredProducts.map(fp => fp.display_order), 0) + 1
      const response = await fetch('/api/featured-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          display_order: newOrder,
          is_active: true,
        }),
      })
      
      if (response.ok) {
        await loadData()
      }
    } catch (error) {
      console.error('Error adding to featured:', error)
    }
  }

  // Remove product from featured
  const removeFromFeatured = async (featuredId: string) => {
    try {
      const response = await fetch(`/api/featured-products/${featuredId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setFeaturedProducts(prev => prev.filter(fp => fp.id !== featuredId))
      }
    } catch (error) {
      console.error('Error removing from featured:', error)
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
            <Link
              href="/admin"
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Öne Çıkan Ürünler
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Ana sayfada gösterilecek öne çıkan ürünleri yönetin
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Featured Products */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Öne Çıkan Ürünler ({featuredProducts.length})
            </h3>
          </div>
          
          <div className="p-6">
            {featuredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz ürün eklenmemiş</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Sağ taraftan ürün seçerek ekleyebilirsiniz
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {featuredProducts
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((featured) => {
                    const product = featured.products
                    if (!product) return null
                    
                    return (
                      <div key={featured.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
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
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {product.brand}
                          </p>
                          <p className="text-sm text-gray-900 font-medium">
                            ₺{product.price.toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromFeatured(featured.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
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

        {/* Available Products */}
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
              {filteredProducts.map(product => {
                const isFeatured = currentProductIds.includes(product.id)
                
                return (
                  <div
                    key={product.id}
                    className={`flex items-center space-x-4 p-3 rounded-lg border ${
                      isFeatured
                        ? 'bg-gray-50 border-gray-200 opacity-50'
                        : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                    }`}
                    onClick={() => !isFeatured && addToFeatured(product.id)}
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
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">{product.brand}</p>
                    </div>
                    {isFeatured ? (
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
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
