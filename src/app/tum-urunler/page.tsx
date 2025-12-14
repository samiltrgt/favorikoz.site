'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { 
  SortAsc, 
  Grid, 
  List, 
  Star, 
  ShoppingCart, 
  Heart,
  Search
} from 'lucide-react'
// Fetch from API to reflect admin edits
import Header from '@/components/header'
import Footer from '@/components/footer'

// Breadcrumb component
function Breadcrumbs() {
  return (
    <nav className="bg-gray-50 py-3">
      <div className="container">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-black transition-colors">Anasayfa</Link>
          <span>/</span>
          <span className="text-black font-medium">Tüm Ürünler</span>
        </div>
      </div>
    </nav>
  )
}

// Product Card component - Zara style minimal design
function ProductCard({ product, viewMode }: { product: any, viewMode: 'grid' | 'list' }) {
  const [isHovered, setIsHovered] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    // Eğer tıklanan element bir button veya link ise, kartın tıklanmasını engelle
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) {
      return
    }
    
    // Kartın tıklanması durumunda ürün sayfasına git
    window.location.href = `/urun/${product.slug}`
  }

  if (viewMode === 'list') {
    return (
      <div 
        className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex gap-6 p-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-black text-sm mb-1 line-clamp-1">{product.name}</h3>
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-wide">{product.brand}</p>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < product.rating ? 'text-black' : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-400 ml-1">({product.reviewCount})</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-light text-black">₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {product.original_price && (
                    <span className="text-xs text-gray-400 line-through">₺{product.original_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  )}
                </div>
                {product.discount && product.discount > 0 && (
                  <span className="text-xs text-red-500">-{product.discount}%</span>
                )}
              </div>
              <button 
                className="bg-black text-white px-6 py-2 text-xs hover:bg-gray-800 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!product.in_stock}
              >
                {product.in_stock ? 'Add' : 'Out of Stock'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="bg-white group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Badges - Minimal style */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.is_new && (
            <span className="bg-black text-white text-xs px-2 py-1 uppercase tracking-wide">New</span>
          )}
          {product.discount && product.discount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 uppercase tracking-wide">
              -{product.discount}%
            </span>
          )}
        </div>

        {/* Quick actions - Hidden by default, show on hover */}
        <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}>
          <button className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white transition-colors">
            <Heart className="w-4 h-4 text-black" />
          </button>
          <button className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white transition-colors">
            <ShoppingCart className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Out of stock overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-black text-sm font-light uppercase tracking-wide">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product Info - Minimal Zara style */}
      <div className="p-3 space-y-1">
        <Link href={`/urun/${product.slug}`}>
          <h3 className="font-medium text-black text-sm line-clamp-2 leading-tight hover:text-gray-600 transition-colors">{product.name}</h3>
        </Link>
        <p className="text-gray-700 text-xs uppercase tracking-wide font-medium">{product.brand}</p>
        
        {/* Rating - Minimal */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${
                i < product.rating ? 'text-black' : 'text-gray-300'
              }`}
            />
          ))}
          <span className="text-xs text-gray-400 ml-1">({product.reviewCount})</span>
        </div>

        {/* Price - Clean and minimal */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-light text-black">₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          {product.original_price && (
            <span className="text-xs text-gray-400 line-through">₺{product.original_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function AllProductsContent() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('newest')
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 40 // render 40 at a time for speed

  // Load products from API with search parameter
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const url = searchQuery 
          ? `/api/products?search=${encodeURIComponent(searchQuery)}`
          : '/api/products'
        const res = await fetch(url, { cache: 'no-store' })
        const json = await res.json()
        if (json.success) setAllProducts(json.data || [])
      } catch {}
      setIsLoading(false)
    }
    load()
  }, [searchQuery])

  // Sort products
  useEffect(() => {
    let filtered = [...allProducts]

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating)
        break
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name))
        break
    }

    setFilteredProducts(filtered)
    setPage(1)
  }, [sortBy, allProducts])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Breadcrumbs />
      
      <div className="container py-8">
        {isLoading && (
          <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
        )}
        {/* Main Content */}
        <div className="w-full">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-light text-black mb-2">
                {searchQuery ? `"${searchQuery}" için arama sonuçları` : 'Tüm Ürünler'}
              </h1>
              <p className="text-gray-600 text-sm">
                {filteredProducts.length} ürün bulundu
                {searchQuery && (
                  <Link 
                    href="/tum-urunler" 
                    className="ml-2 text-gray-400 hover:text-black underline"
                  >
                    Tüm ürünleri göster
                  </Link>
                )}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <SortAsc className="w-4 h-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="newest">En Yeni</option>
                  <option value="oldest">En Eski</option>
                  <option value="price-low">Fiyat (Düşük → Yüksek)</option>
                  <option value="price-high">Fiyat (Yüksek → Düşük)</option>
                  <option value="rating">En Yüksek Puan</option>
                  <option value="name-asc">İsim (A → Z)</option>
                  <option value="name-desc">İsim (Z → A)</option>
                </select>
              </div>

              {/* View Mode */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid/List - With proper spacing */}
          <div className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6' 
              : 'space-y-4'
            }
          `}>
            {filteredProducts.slice((page-1)*pageSize, page*pageSize).map((product, index) => (
              <div
                key={product.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ProductCard product={product} viewMode={viewMode} />
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ürün bulunamadı</h3>
              <p className="text-gray-500 mb-4">Arama kriterlerinizi değiştirmeyi deneyin</p>
            </div>
          )}

          {/* Pagination */}
          {filteredProducts.length > 0 && (
            <div className="mt-12 flex justify-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                <span className="px-3 py-2 text-sm">Sayfa {page} / {Math.max(1, Math.ceil(filteredProducts.length / pageSize))}</span>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(filteredProducts.length / pageSize), p + 1))}
                  disabled={page >= Math.ceil(filteredProducts.length / pageSize)}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default function AllProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Header />
        <Breadcrumbs />
        <div className="container py-8">
          <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
        </div>
        <Footer />
      </div>
    }>
      <AllProductsContent />
    </Suspense>
  )
}