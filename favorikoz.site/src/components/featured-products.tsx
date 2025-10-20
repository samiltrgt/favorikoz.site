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
  const [customProducts, setCustomProducts] = useState<any[]>(products)

  // Load custom featured products from localStorage
  useEffect(() => {
    if (section) {
      const saved = localStorage.getItem('featuredProducts')
      if (saved) {
        const featuredProducts = JSON.parse(saved)
        const sectionProducts = featuredProducts
          .filter((fp: any) => fp.section === section)
          .sort((a: any, b: any) => a.order - b.order)
          .map((fp: any) => {
            return products.find(p => p.id === fp.productId)
          })
          .filter(Boolean)
        
        if (sectionProducts.length > 0) {
          setCustomProducts(sectionProducts)
        }
      }
    }
  }, [section, products])

  const displayProducts = section ? customProducts : products
  return (
    <section className="py-24 bg-white">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-light text-black mb-6 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Desktop Products Grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
          {displayProducts.slice(0, 3).map((product, index) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Mobile Scrollable Grid - 2x3 Layout */}
        <div className="md:hidden mb-16">
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            {displayProducts.slice(0, 6).map((product, index) => (
              <div key={product.id} className="flex-shrink-0 w-[calc(50%-8px)]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
        
        {/* View All Button */}
        {viewAllLink && (
          <div className="text-center">
            <Link
              href={viewAllLink}
              className="inline-flex items-center gap-3 px-12 py-5 bg-transparent hover:bg-gray-50 text-black font-light text-lg tracking-wide transition-all duration-300 border border-black rounded-full"
            >
              TÜM ÜRÜNLERİ GÖRÜNTÜLE
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
