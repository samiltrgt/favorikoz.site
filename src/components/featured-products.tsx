'use client'

import Link from 'next/link'
import ProductCard from './product-card'
import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FeaturedProductsProps {
  title: string
  subtitle?: string
  products: any[]
  viewAllLink?: string
  section?: 'bestSellers' | 'newProducts'
}

export default function FeaturedProducts({ 
  title, 
  subtitle, 
  products, 
  viewAllLink,
  section
}: FeaturedProductsProps) {
  const [displayProducts, setDisplayProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load products based on section
  useEffect(() => {
    const loadProducts = async () => {
      if (section === 'bestSellers') {
        // Show is_best_seller products
        const bestSellers = products.filter((p: any) => p.is_best_seller).slice(0, 8)
        console.log('🔥 Best Sellers:', {
          total: products.length,
          bestSellersCount: bestSellers.length,
          bestSellers: bestSellers.map(p => ({ name: p.name, is_best_seller: p.is_best_seller }))
        })
        setDisplayProducts(bestSellers)
      } else if (section === 'newProducts') {
        // Show is_new products
        const newProducts = products.filter((p: any) => p.is_new).slice(0, 8)
        console.log('⭐ New Products:', {
          total: products.length,
          newProductsCount: newProducts.length,
          newProducts: newProducts.map(p => ({ name: p.name, is_new: p.is_new }))
        })
        setDisplayProducts(newProducts)
      } else {
        // Try to load from featured_products API
        try {
          const response = await fetch('/api/featured-products')
          const result = await response.json()
          if (result.success && result.data?.length > 0) {
            const featured = result.data.map((fp: any) => fp.products).filter(Boolean)
            setDisplayProducts(featured.slice(0, 8))
          } else {
            setDisplayProducts(products.slice(0, 8))
          }
        } catch {
          setDisplayProducts(products.slice(0, 8))
        }
      }
      setIsLoading(false)
    }

    loadProducts()
  }, [section, products])

  if (isLoading) {
    return null
  }

  // Special layout for best sellers
  if (section === 'bestSellers') {
    if (displayProducts.length === 0) {
      return null
    }

    return (
      <section className="py-16 sm:py-20 bg-white">
        <div className="container max-w-7xl">
          {/* Header */}
          <div className="mb-12 sm:mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-black mb-2 tracking-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-sm sm:text-base text-gray-600 max-w-xl leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>
              {viewAllLink && (
                <Link
                  href={viewAllLink}
                  className="hidden sm:flex items-center gap-2 text-sm font-light text-black hover:text-gray-600 transition-colors"
                >
                  Tümünü Gör
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
          
          {/* Products Grid - Clean Layout */}
          {displayProducts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {displayProducts.slice(0, 8).map((product) => {
                if (!product || !product.id) return null
                return <ProductCard key={product.id} product={product} />
              })}
            </div>
          )}

          {/* Mobile View All Button */}
          {viewAllLink && (
            <div className="sm:hidden text-center">
              <Link
                href={viewAllLink}
                className="inline-flex items-center gap-2 text-sm font-light text-black border-b border-black pb-1 hover:border-gray-400 transition-colors"
              >
                Tümünü Gör
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
    )
  }

  // Default layout for other sections
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-light text-black mb-4 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Desktop Products Grid */}
        {displayProducts.length > 0 && (
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {displayProducts.slice(0, 4).map((product) => {
              if (!product || !product.id) return null
              return <ProductCard key={product.id} product={product} />
            })}
          </div>
        )}

        {/* Mobile Scrollable Grid */}
        {displayProducts.length > 0 && (
          <div className="md:hidden mb-12">
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {displayProducts.slice(0, 6).map((product) => {
                if (!product || !product.id) return null
                return (
                  <div key={product.id} className="flex-shrink-0 w-[calc(50%-8px)]">
                    <ProductCard product={product} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {/* View All Button */}
        {viewAllLink && (
          <div className="text-center">
            <Link
              href={viewAllLink}
              className="inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 bg-black hover:bg-gray-800 text-white font-light text-base sm:text-lg tracking-wide transition-all duration-300 rounded-full transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Tümünü Gör
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
