'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Heart, ShoppingCart } from 'lucide-react'

interface Product {
  id: string
  slug: string
  name: string
  brand?: string
  price: number
  original_price?: number | null
  image: string
  rating?: number
  reviews_count?: number
  in_stock?: boolean
}

interface ProductCardModernProps {
  product: Product
  index?: number
  showBrandBadge?: boolean
}

export default function ProductCardModern({ product, index = 0, showBrandBadge = true }: ProductCardModernProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  const discount = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 animate-fade-in-up border border-gray-100"
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <Link href={`/urun/${product.slug}`} className="block relative aspect-square overflow-hidden bg-gray-50">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        
        {/* Discount Badge - Site primary color */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-[hsl(24,15%,15%)] text-white text-xs font-bold rounded-full shadow-lg">
            -{discount}%
          </div>
        )}

        {/* Marka badge'i - Opsiyonel */}
        {showBrandBadge && product.brand && (
          <>
            {product.brand.toLowerCase().trim() === 'favori' ? (
              <div className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-[hsl(24,15%,15%)] to-[hsl(20,15%,30%)] text-white text-xs font-bold rounded-full shadow-lg">
                Favori
              </div>
            ) : product.brand.toLowerCase().includes('fontenay') ? (
              <div className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-[hsl(24,15%,15%)] to-[hsl(20,15%,30%)] text-white text-xs font-bold rounded-full shadow-lg">
                Fontenay
              </div>
            ) : null}
          </>
        )}

        {/* Quick Actions - Hover */}
        <div 
          className={`absolute bottom-3 left-3 right-3 flex items-center gap-2 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            onClick={(e) => {
              e.preventDefault()
              setIsFavorite(!isFavorite)
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl hover:bg-[hsl(30,25%,90%)] transition-colors shadow-lg"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[hsl(24,15%,15%)] text-[hsl(24,15%,15%)]' : 'text-[hsl(24,10%,40%)]'}`} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              // Sepete ekle fonksiyonu
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[hsl(24,15%,15%)] text-white rounded-xl hover:bg-[hsl(24,15%,20%)] hover:shadow-xl transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4 space-y-2">
        <Link href={`/urun/${product.slug}`}>
          <h3 className="font-medium text-[hsl(24,15%,15%)] text-sm leading-tight line-clamp-2 hover:text-[hsl(24,15%,35%)] transition-colors min-h-[2.5rem]">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < Math.floor(product.rating || 0)
                    ? 'text-[hsl(24,15%,15%)] fill-[hsl(24,15%,15%)]'
                    : 'text-[hsl(30,20%,85%)]'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-[hsl(24,10%,40%)]">
            ({product.reviews_count || 0})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xl font-bold text-[hsl(24,15%,15%)]">
            ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-sm text-[hsl(24,10%,40%)] line-through">
              ₺{product.original_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Border on Hover - Site border color */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-[hsl(24,15%,15%)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )
}
