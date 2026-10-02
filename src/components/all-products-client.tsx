'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SortAsc, Grid, List, Search } from 'lucide-react'
import ProductCard from '@/components/product-card'
import type { CategoryListProduct } from '@/lib/category-products'

const PAGE_SIZE = 40

type Props = {
  products: CategoryListProduct[]
}

function sortProducts(list: CategoryListProduct[], sortBy: string): CategoryListProduct[] {
  const filtered = [...list]
  switch (sortBy) {
    case 'newest':
      return filtered.sort((a, b) => {
        const byDate =
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        if (byDate !== 0) return byDate
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
      })
    case 'oldest':
      return filtered.sort((a, b) => {
        const byDate =
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        if (byDate !== 0) return byDate
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
      })
    case 'price-low':
      return filtered.sort((a, b) => a.price - b.price)
    case 'price-high':
      return filtered.sort((a, b) => b.price - a.price)
    case 'rating':
      return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    case 'name-asc':
      return filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
    case 'name-desc':
      return filtered.sort((a, b) => b.name.localeCompare(a.name, 'tr'))
    default:
      return filtered
  }
}

export default function AllProductsClient({ products }: Props) {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const brandFilter = searchParams.get('brand') || ''

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)

  const filteredProducts = useMemo(() => {
    let list = products

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
      )
    }

    if (brandFilter) {
      const brand = brandFilter.toLowerCase()
      list = list.filter((p) => (p.brand || '').toLowerCase().includes(brand))
    }

    return sortProducts(list, sortBy)
  }, [products, searchQuery, brandFilter, sortBy])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, brandFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const pageItems = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-light text-black mb-2">
            {searchQuery
              ? `"${searchQuery}" için arama sonuçları`
              : brandFilter
                ? `${brandFilter.charAt(0).toUpperCase() + brandFilter.slice(1)} Ürünleri`
                : 'Tüm Ürünler'}
          </h1>
          <p className="text-gray-600 text-sm">
            {filteredProducts.length} ürün bulundu
            {(searchQuery || brandFilter) && (
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

          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              aria-label="Izgara görünümü"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              aria-label="Liste görünümü"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 max-[360px]:grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6'
            : 'space-y-4'
        }
      >
        {pageItems.map((product, index) => (
          <div
            key={product.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <ProductCard
              product={product}
              variant={viewMode}
              index={index}
              showBrandBadge={false}
            />
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ürün bulunamadı</h3>
          <p className="text-gray-500 mb-4">Arama kriterlerinizi değiştirmeyi deneyin</p>
        </div>
      )}

      {filteredProducts.length > 0 && (
        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <span className="px-3 py-2 text-sm">
              Sayfa {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
