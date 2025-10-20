'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  Search,
  Package,
  Star
} from 'lucide-react'
import { products } from '@/lib/dummy-data'

interface FeaturedProduct {
  id: string
  productId: string
  section: 'bestSellers' | 'newProducts'
  order: number
}

export default function FeaturedProductsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSection, setSelectedSection] = useState<'bestSellers' | 'newProducts'>('bestSellers')
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load featured products from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('featuredProducts')
    if (saved) {
      setFeaturedProducts(JSON.parse(saved))
    }
  }, [])

  // Save to localStorage
  const saveFeaturedProducts = (newProducts: FeaturedProduct[]) => {
    setFeaturedProducts(newProducts)
    localStorage.setItem('featuredProducts', JSON.stringify(newProducts))
  }

  // Filter products based on search
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get current featured products for selected section
  const currentFeatured = featuredProducts.filter(fp => fp.section === selectedSection)
  const currentProductIds = currentFeatured.map(fp => fp.productId)

  // Add product to featured
  const addToFeatured = (productId: string) => {
    const newOrder = Math.max(...featuredProducts.filter(fp => fp.section === selectedSection).map(fp => fp.order), 0) + 1
    const newFeatured: FeaturedProduct = {
      id: `fp-${Date.now()}`,
      productId,
      section: selectedSection,
      order: newOrder
    }
    
    const updated = [...featuredProducts, newFeatured]
    saveFeaturedProducts(updated)
  }

  // Remove product from featured
  const removeFromFeatured = (featuredId: string) => {
    const updated = featuredProducts.filter(fp => fp.id !== featuredId)
    saveFeaturedProducts(updated)
  }

  // Reorder products
  const reorderProducts = (fromIndex: number, toIndex: number) => {
    const sectionProducts = featuredProducts.filter(fp => fp.section === selectedSection)
    const [moved] = sectionProducts.splice(fromIndex, 1)
    sectionProducts.splice(toIndex, 0, moved)
    
    // Update order numbers
    sectionProducts.forEach((fp, index) => {
      fp.order = index + 1
    })
    
    const updated = featuredProducts.filter(fp => fp.section !== selectedSection).concat(sectionProducts)
    saveFeaturedProducts(updated)
  }

  // Get product details
  const getProductDetails = (productId: string) => {
    return products.find(p => p.id === productId)
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
                Ana sayfadaki çok satanlar ve yeni ürünler bölümlerini yönetin
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setSelectedSection('bestSellers')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              selectedSection === 'bestSellers'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Çok Satanlar
          </button>
          <button
            onClick={() => setSelectedSection('newProducts')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              selectedSection === 'newProducts'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Yeni Ürünler
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Featured Products */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {selectedSection === 'bestSellers' ? 'Çok Satanlar' : 'Yeni Ürünler'} 
              ({currentFeatured.length} ürün)
            </h3>
          </div>
          
          <div className="p-6">
            {currentFeatured.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz ürün eklenmemiş</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Sağ taraftan ürün seçerek ekleyebilirsiniz
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentFeatured
                  .sort((a, b) => a.order - b.order)
                  .map((featured, index) => {
                    const product = getProductDetails(featured.productId)
                    if (!product) return null
                    
                    return (
                      <div key={featured.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </h4>
                          <p className="text-sm text-gray-500">{product.brand}</p>
                          <div className="flex items-center mt-1">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.floor(product.rating || 0)
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="ml-1 text-xs text-gray-500">
                              {product.rating?.toFixed(1) || '0.0'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            ₺{product.price.toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeFromFeatured(featured.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Product Selection */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Ürün Ekle</h3>
          </div>
          
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>

            {/* Products List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => {
                const isAlreadyFeatured = currentProductIds.includes(product.id)
                
                return (
                  <div key={product.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-500">{product.brand}</p>
                      <div className="flex items-center mt-1">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(product.rating || 0)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-1 text-xs text-gray-500">
                          {product.rating?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        ₺{product.price.toLocaleString()}
                      </span>
                      <button
                        onClick={() => addToFeatured(product.id)}
                        disabled={isAlreadyFeatured}
                        className={`p-2 rounded-md text-sm font-medium transition-colors ${
                          isAlreadyFeatured
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-900 text-white hover:bg-gray-700'
                        }`}
                      >
                        {isAlreadyFeatured ? 'Eklendi' : 'Ekle'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Nasıl Kullanılır?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Üst kısımdan "Çok Satanlar" veya "Yeni Ürünler" bölümünü seçin</li>
          <li>• Sağ taraftan ürün arayıp istediğiniz ürünleri ekleyin</li>
          <li>• Sol tarafta eklenen ürünleri görebilir ve silebilirsiniz</li>
          <li>• Değişiklikler otomatik olarak kaydedilir</li>
        </ul>
      </div>
    </div>
  )
}
