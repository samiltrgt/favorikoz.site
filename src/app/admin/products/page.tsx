'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  MoreVertical,
  Package
} from 'lucide-react'

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])
  const [subcategoriesMap, setSubcategoriesMap] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load categories from API (only main categories, not subcategories)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const result = await response.json()
        if (result.success && result.mainCategories) {
          // Sadece ana kategorileri al (parent_slug olmayanlar)
          const mappedCategories = result.mainCategories.map((cat: any) => ({
            value: cat.slug,
            label: cat.name
          }))
          setCategories([
            { value: 'all', label: 'Tüm Kategoriler' },
            ...mappedCategories
          ])
          
          // Alt kategorileri map'le (ana kategori slug -> alt kategori slug'ları)
          if (result.subcategories) {
            const map: Record<string, string[]> = {}
            result.subcategories.forEach((sub: any) => {
              if (sub.parent_slug) {
                if (!map[sub.parent_slug]) {
                  map[sub.parent_slug] = []
                }
                map[sub.parent_slug].push(sub.slug)
              }
            })
            setSubcategoriesMap(map)
          }
        } else if (result.success && result.data) {
          // Fallback: data varsa ama mainCategories yoksa, parent_slug olmayanları filtrele
          const mainCategories = result.data.filter((cat: any) => !cat.parent_slug)
          const mappedCategories = mainCategories.map((cat: any) => ({
            value: cat.slug,
            label: cat.name
          }))
          setCategories([
            { value: 'all', label: 'Tüm Kategoriler' },
            ...mappedCategories
          ])
          
          // Alt kategorileri map'le
          const subcategories = result.data.filter((cat: any) => cat.parent_slug)
          const map: Record<string, string[]> = {}
          subcategories.forEach((sub: any) => {
            if (sub.parent_slug) {
              if (!map[sub.parent_slug]) {
                map[sub.parent_slug] = []
              }
              map[sub.parent_slug].push(sub.slug)
            }
          })
          setSubcategoriesMap(map)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        // Fallback to default categories
        setCategories([
          { value: 'all', label: 'Tüm Kategoriler' },
          { value: 'kisisel-bakim', label: 'Kişisel Bakım' },
          { value: 'sac-bakimi', label: 'Saç Bakımı' },
          { value: 'tirnak', label: 'Tırnak' },
          { value: 'ipek-kirpik', label: 'İpek Kirpik' },
          { value: 'kuafor-malzemeleri', label: 'Kuaför Malzemeleri' },
        ])
      }
    }
    loadCategories()
  }, [])

  // Load products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products')
        const result = await response.json()
        if (result.success) {
          setProducts(result.data)
        }
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProducts()
  }, [])

  // Refresh products when returning to this page
  useEffect(() => {
    const handleFocus = () => {
      const loadProducts = async () => {
        try {
          const response = await fetch('/api/products')
          const result = await response.json()
          if (result.success) {
            setProducts(result.data)
          }
        } catch (error) {
          console.error('Error loading products:', error)
        }
      }
      
      loadProducts()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Kategori kontrolü
    if (selectedCategory === 'all') {
      return matchesSearch
    }
    
    // Ana kategori seçildiğinde: hem ana kategori hem de alt kategorileri kontrol et
    // 1. Direkt ana kategori eşleşmesi
    const directCategoryMatch = product.category_slug === selectedCategory ||
                                product.category === selectedCategory
    
    // 2. Alt kategori kontrolü: Ürünün alt kategorisi seçili ana kategoriye ait mi?
    const subcategorySlugs = subcategoriesMap[selectedCategory] || []
    const subcategoryMatch = product.subcategory_slug && 
                            subcategorySlugs.includes(product.subcategory_slug)
    
    // 3. Alt kategori direkt eşleşmesi (eğer alt kategori seçildiyse)
    const directSubcategoryMatch = product.subcategory_slug === selectedCategory
    
    const matchesCategory = directCategoryMatch || subcategoryMatch || directSubcategoryMatch
    return matchesSearch && matchesCategory
  })

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'price':
        return a.price - b.price
      case 'brand':
        return a.brand.localeCompare(b.brand)
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default:
        return 0
    }
  })


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ürünler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Ürün Yönetimi
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Ürünlerinizi ekleyin, düzenleyin ve yönetin
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Ürün Ekle
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ürün, marka veya kod ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="name">İsme Göre</option>
            <option value="price">Fiyata Göre</option>
            <option value="brand">Markaya Göre</option>
            <option value="created">Tarihe Göre</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Ürünler ({sortedProducts.length})
            </h3>
          </div>

          {sortedProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Ürün bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                Arama kriterlerinize uygun ürün bulunamadı.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedProducts.map((product) => (
                <div key={product.id} className="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-square relative overflow-hidden rounded-t-lg">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {product.is_new && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                        Yeni
                      </div>
                    )}
                    {product.isBestSeller && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        Çok Satan
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
                    {product.barcode && (
                      <p className="text-xs text-gray-400 font-mono mb-2">
                        Kod: {product.barcode}
                      </p>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-gray-900">₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      {product.original_price && (
                        <span className="text-sm text-gray-500 line-through">₺{product.original_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`h-3 w-3 ${
                                i < product.rating ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="ml-1 text-xs text-gray-500">({product.reviewCount})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
                        title="Düzenle"
                      >
                        <Edit className="h-4 w-4 text-gray-600" />
                      </Link>
                      <button
                        className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
