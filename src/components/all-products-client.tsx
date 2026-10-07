'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { catalogHref } from '@/lib/seo/catalog'
import { SortAsc, Grid, List, Search } from 'lucide-react'
import ProductCard from '@/components/product-card'
import type { CategoryListProduct } from '@/lib/category-products'

type Props = {
  pageItems: CategoryListProduct[]
  totalCount: number
  totalPages: number
  page: number
  searchQuery: string
  brandFilter: string
  sortBy: string
}

export default function AllProductsClient({ pageItems, totalCount, totalPages, page, searchQuery, brandFilter, sortBy }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  function setSortBy(value: string) {
    const query = new URLSearchParams(searchParams.toString())
    if (value === 'newest') query.delete('sort')
    else query.set('sort', value)
    router.push(catalogHref(query, 1), { scroll: false })
  }

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
            {totalCount} ürün bulundu
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

      {totalCount === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ürün bulunamadı</h3>
          <p className="text-gray-500 mb-4">Arama kriterlerinizi değiştirmeyi deneyin</p>
        </div>
      )}

      {totalCount > 0 && (
        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-2">
            {page > 1 ? <Link
              href={catalogHref(new URLSearchParams(searchParams.toString()), page - 1)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </Link> : <span className="px-3 py-2 text-sm text-gray-400">Önceki</span>}
            <span className="px-3 py-2 text-sm">
              Sayfa {page} / {totalPages}
            </span>
            {page < totalPages ? <Link
              href={catalogHref(new URLSearchParams(searchParams.toString()), page + 1)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </Link> : <span className="px-3 py-2 text-sm text-gray-400">Sonraki</span>}
          </div>
        </div>
      )}
    </div>
  )
}
