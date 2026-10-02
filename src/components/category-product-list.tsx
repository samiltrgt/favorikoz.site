'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Filter, Grid, List } from 'lucide-react'
import ProductCard from '@/components/product-card'
import type { CategoryListProduct } from '@/lib/category-products'

const sortOptions = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price-low', label: 'Fiyat (Düşük → Yüksek)' },
  { value: 'price-high', label: 'Fiyat (Yüksek → Düşük)' },
  { value: 'rating', label: 'En Yüksek Puan' },
  { value: 'name', label: 'İsim (A → Z)' },
]

function sortProducts(products: CategoryListProduct[], sortBy: string): CategoryListProduct[] {
  const filtered = [...products]
  switch (sortBy) {
    case 'newest':
      return filtered.sort((a, b) => {
        const byDate =
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        if (byDate !== 0) return byDate
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
      })
    case 'price-low':
      return filtered.sort((a, b) => a.price - b.price)
    case 'price-high':
      return filtered.sort((a, b) => b.price - a.price)
    case 'rating':
      return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    case 'name':
      return filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
    default:
      return filtered
  }
}

type CategoryProductListProps = {
  products: CategoryListProduct[]
  emptyTitle?: string
  emptyHref?: string
  emptyLinkLabel?: string
}

export default function CategoryProductList({
  products,
  emptyTitle = 'Bu kategoride ürün bulunamadı',
  emptyHref = '/tum-urunler',
  emptyLinkLabel = 'Tüm Ürünleri Görüntüle',
}: CategoryProductListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('newest')

  const filteredProducts = useMemo(() => sortProducts(products, sortBy), [products, sortBy])

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
              aria-label="Izgara görünümü"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
              aria-label="Liste görünümü"
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
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div
          className={`grid gap-4 xl:gap-6 ${
            viewMode === 'grid'
              ? 'grid-cols-2 max-[360px]:grid-cols-1 lg:grid-cols-4'
              : 'grid-cols-1'
          }`}
        >
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              variant={viewMode}
              showBrandBadge={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Filter className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-light text-black mb-4">{emptyTitle}</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Aradığınız kriterlere uygun ürün bulunmamaktadır. Filtreleri değiştirmeyi deneyin.
          </p>
          <Link
            href={emptyHref}
            className="inline-flex items-center gap-2 px-8 py-4 bg-black hover:bg-gray-800 text-white font-light text-lg transition-all duration-300 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
            {emptyLinkLabel}
          </Link>
        </div>
      )}
    </>
  )
}
