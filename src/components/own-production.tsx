'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Heart, ShoppingCart, Sparkles } from 'lucide-react'

interface Product {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  original_price?: number | null
  image: string
  rating: number
  reviews_count: number
  in_stock: boolean
}

interface OwnProductionProps {
  products: Product[]
}

export default function OwnProduction({ products }: OwnProductionProps) {
  // Favori markamız olan ürünleri filtrele
  // Büyük/küçük harf ve boşluk farkını göz ardı et
  const ownProducts = products.filter(p => 
    p.brand?.toLowerCase().trim() === 'favori'
  ).slice(0, 8)

  // Debug: Console'da kontrol et
  console.log('Total products:', products.length)
  console.log('Own products:', ownProducts.length)
  console.log('Sample brands:', products.slice(0, 5).map(p => p.brand))

  // Eğer Favori markalı ürün yoksa, tüm ürünlerden ilk 8'ini göster
  const displayProducts = ownProducts.length > 0 ? ownProducts : products.slice(0, 8)
  const hasOwnProducts = ownProducts.length > 0

  if (displayProducts.length === 0) {
    return null
  }

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-rose-100/40 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-100/40 to-transparent rounded-full blur-3xl" />
      
      <div className="container relative z-10">
        {/* Section Header - Ultra Modern */}
        <div className="text-center mb-16 space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500/10 to-purple-500/10 rounded-full border border-rose-200/50 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <span className="text-sm font-medium text-gray-700 tracking-wide">Exclusive Collection</span>
          </div>
          
          {/* Main Title */}
          <h2 className="text-5xl md:text-6xl font-light tracking-tight text-gray-900">
            {hasOwnProducts ? (
              <>Kendi <span className="font-semibold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">Üretimimiz</span></>
            ) : (
              <>Öne <span className="font-semibold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">Çıkan Ürünler</span></>
            )}
          </h2>
          
          {/* Subtitle */}
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {hasOwnProducts 
              ? 'Özenle tasarlanan, en kaliteli malzemelerle üretilen özel koleksiyonumuz'
              : 'Sizin için özenle seçtiğimiz premium kalite ürünler'
            }
          </p>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-[2px] bg-gradient-to-r from-transparent to-rose-400" />
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <div className="w-12 h-[2px] bg-gradient-to-l from-transparent to-rose-400" />
          </div>
        </div>

        {/* Products Grid - Premium Design */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link 
            href={hasOwnProducts ? "/tum-urunler?brand=favori" : "/tum-urunler"}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            <span className="font-medium">Tümünü Keşfet</span>
            <svg 
              className="w-5 h-5 group-hover:translate-x-1 transition-transform" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

function ProductCard({ product, index }: { product: Product; index: number }) {
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
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        
        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
            -{discount}%
          </div>
        )}

        {/* Favori markası badge - sadece gerçekten Favori markalı ürünlerde göster */}
        {product.brand?.toLowerCase().trim() === 'favori' && (
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-rose-600 text-white text-xs font-bold rounded-full shadow-lg">
            Favori
          </div>
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
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl hover:bg-rose-50 transition-colors shadow-lg"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              // Sepete ekle fonksiyonu
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:shadow-xl transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4 space-y-2">
        <Link href={`/urun/${product.slug}`}>
          <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 hover:text-rose-600 transition-colors min-h-[2.5rem]">
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
                  i < Math.floor(product.rating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            ({product.reviews_count})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xl font-bold text-gray-900">
            ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-sm text-gray-400 line-through">
              ₺{product.original_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Gradient Border on Hover */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-gradient-to-r group-hover:from-rose-400 group-hover:to-purple-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )
}
