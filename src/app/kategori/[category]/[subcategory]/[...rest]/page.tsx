'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Filter, Grid, List } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import ProductCardModern from '@/components/product-card-modern'

const sortOptions = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price-low', label: 'Fiyat (Dusuk -> Yuksek)' },
  { value: 'price-high', label: 'Fiyat (Yuksek -> Dusuk)' },
  { value: 'name', label: 'Isim (A -> Z)' },
]

export default function DeepCategoryPage() {
  const params = useParams()
  const categorySlug = params.category as string
  const firstSubcategorySlug = params.subcategory as string
  const rest = (params.rest as string[]) || []
  const leafSubcategorySlug = rest[rest.length - 1] || firstSubcategorySlug

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('newest')
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nameBySlug, setNameBySlug] = useState<Record<string, string>>({})

  const chain = [categorySlug, firstSubcategorySlug, ...rest]

  useEffect(() => {
    const load = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`/api/products?subcategory=${leafSubcategorySlug}`, { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
        ])

        const productsJson = await productsRes.json()
        if (productsJson.success) setAllProducts(productsJson.data || [])

        const categoriesJson = await categoriesRes.json()
        if (categoriesJson.success && Array.isArray(categoriesJson.flat)) {
          const map: Record<string, string> = {}
          for (const row of categoriesJson.flat as Array<{ slug: string; name: string }>) {
            map[row.slug] = row.name
          }
          setNameBySlug(map)
        }
      } catch {}
      setIsLoading(false)
    }
    load()
  }, [leafSubcategorySlug])

  useEffect(() => {
    let filtered = allProducts.filter((product: any) => {
      if (!product.in_stock || product.stock_quantity <= 0) return false
      if (product.category_slug !== categorySlug) return false
      return product.subcategory_slug === leafSubcategorySlug
    })

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
      case 'name':
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
        break
    }
    setFilteredProducts(filtered)
  }, [allProducts, categorySlug, leafSubcategorySlug, sortBy])

  const pageTitle = nameBySlug[leafSubcategorySlug] || leafSubcategorySlug
  const upPath = chain.length > 2 ? `/kategori/${categorySlug}/${chain.slice(1, -1).join('/')}` : `/kategori/${categorySlug}`

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container">
          {isLoading && <div className="text-center py-20 text-gray-600">Yukleniyor...</div>}

          <nav className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-black">Anasayfa</Link>
              {chain.map((slug, idx) => {
                const isLast = idx === chain.length - 1
                const href =
                  idx === 0
                    ? `/kategori/${slug}`
                    : `/kategori/${categorySlug}/${chain.slice(1, idx + 1).join('/')}`
                return (
                  <span key={slug + idx} className="flex items-center gap-2">
                    <span>/</span>
                    {isLast ? (
                      <span className="text-black">{nameBySlug[slug] || slug}</span>
                    ) : (
                      <Link href={href} className="hover:text-black">{nameBySlug[slug] || slug}</Link>
                    )}
                  </span>
                )
              })}
            </div>
          </nav>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Link
                href={upPath}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Ust kategoriye don
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-light text-black mb-2">{pageTitle}</h1>
            <p className="text-gray-600">{filteredProducts.length} urun bulundu</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-black text-white' : 'text-gray-600 hover:text-black hover:bg-gray-100'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-black text-white' : 'text-gray-600 hover:text-black hover:bg-gray-100'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
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

          {filteredProducts.length > 0 ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredProducts.map((product, index) => (
                <ProductCardModern key={product.id} product={product} index={index} showBrandBadge={false} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <Filter className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-light text-black mb-4">Bu kategoride urun bulunamadi</h2>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

