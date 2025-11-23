'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Filter, Grid, List, Star } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
// Fetch from API to reflect admin edits

const categoryNames: { [key: string]: string } = {
  'kisisel-bakim': 'Kişisel Bakım',
  'sac-bakimi': 'Saç Bakımı', 
  'protez-tirnak': 'Protez Tırnak',
  'ipek-kirpik': 'İpek Kirpik'
}

const sortOptions = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price-low', label: 'Fiyat (Düşük → Yüksek)' },
  { value: 'price-high', label: 'Fiyat (Yüksek → Düşük)' },
  { value: 'rating', label: 'En Yüksek Puan' },
  { value: 'name', label: 'İsim (A → Z)' }
]

export default function CategoryPage() {
  const params = useParams()
  const categorySlug = params.slug as string
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('newest')
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])

  // Load products from API
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/products', { cache: 'no-store' })
        const json = await res.json()
        if (json.success) setAllProducts(json.data || [])
      } catch {}
      setIsLoading(false)
    }
    load()
  }, [])

  // Kategoriye göre filtrele
  useEffect(() => {
    let filtered = allProducts.filter((product:any) => product.category_slug === categorySlug)
    
    // Sıralama
    switch (sortBy) {
      case 'newest':
        filtered = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'price-low':
        filtered = filtered.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        filtered = filtered.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'name':
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
        break
    }
    
    setFilteredProducts(filtered)
  }, [categorySlug, sortBy, allProducts])

  const categoryName = categoryNames[categorySlug] || 'Kategori'

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container">
          {isLoading && (
            <div className="text-center py-20 text-gray-600">Yükleniyor...</div>
          )}
          {/* Breadcrumb */}
          <nav className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-black">Anasayfa</Link>
              <span>/</span>
              <Link href="/tum-urunler" className="hover:text-black">Tüm Ürünler</Link>
              <span>/</span>
              <span className="text-black">{categoryName}</span>
            </div>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Link 
                href="/tum-urunler" 
                className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Geri Dön
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-light text-black mb-2">{categoryName}</h1>
            <p className="text-gray-600">
              {filteredProducts.length} ürün bulundu
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-black text-white' 
                      : 'text-gray-600 hover:text-black hover:bg-gray-100'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-black text-white' 
                      : 'text-gray-600 hover:text-black hover:bg-gray-100'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className={`group bg-white border border-gray-100 hover:shadow-lg transition-all duration-300 ${
                    viewMode === 'list' ? 'flex gap-4 p-4' : 'p-4'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`relative overflow-hidden bg-gray-50 ${
                    viewMode === 'list' ? 'w-24 h-24 flex-shrink-0' : 'aspect-square'
                  }`}>
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes={viewMode === 'list' ? '96px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'}
                    />
                    {product.is_new && (
                      <div className="absolute top-2 left-2 bg-black text-white text-xs px-2 py-1 rounded">
                        YENİ
                      </div>
                    )}
                    {product.isBestSeller && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        ÇOK SATAN
                      </div>
                    )}
                    {!product.in_stock && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">Stokta Yok</span>
                      </div>
                    )}
                  </div>

                  <div className={`${viewMode === 'list' ? 'flex-1' : 'mt-4'}`}>
                    <div className="mb-2">
                      <h3 className="font-medium text-black text-sm leading-tight mb-1 line-clamp-2">
                        <Link href={`/urun/${product.slug}`} className="hover:text-gray-600">
                          {product.name}
                        </Link>
                      </h3>
                      <p className="text-gray-700 text-xs uppercase tracking-wide">{product.brand}</p>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
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
                      <span className="text-xs text-gray-500">
                        {product.rating?.toFixed(1) || '0.0'} ({product.reviewCount} değerlendirme)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {product.original_price && (
                          <span className="text-sm text-gray-400 line-through">
                            ₺{(product.original_price / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                        <span className="font-light text-black">
                          ₺{(product.price / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {product.discount && (
                          <span className="text-xs text-red-600 font-medium">
                            -%{product.discount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <Filter className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-light text-black mb-4">Bu kategoride ürün bulunamadı</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Aradığınız kriterlere uygun ürün bulunmamaktadır. Filtreleri değiştirmeyi deneyin.
              </p>
              <Link
                href="/tum-urunler"
                className="inline-flex items-center gap-2 px-8 py-4 bg-black hover:bg-gray-800 text-white font-light text-lg transition-all duration-300 rounded-full"
              >
                <ArrowLeft className="w-4 h-4" />
                Tüm Ürünleri Görüntüle
              </Link>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
