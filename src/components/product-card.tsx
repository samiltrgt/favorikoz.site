'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingCart, Star, Truck, RotateCcw } from 'lucide-react'

interface ProductCardProps {
  product: {
    id: string
    slug: string
    name: string
    brand: string
    price: number
    original_price?: number
    image: string
    rating: number
    reviews_count: number
    is_new?: boolean
    is_best_seller?: boolean
    discount?: number
    in_stock: boolean
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  const handleAddToCart = async () => {
    if (!product.in_stock) {
      return // Stokta yoksa sepete ekleme
    }
    
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsLoading(false)
    // TODO: Add to cart logic
  }

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite)
    // TODO: Add to favorites logic
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Eğer tıklanan element bir button veya link ise, kartın tıklanmasını engelle
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) {
      return
    }
    
    // Kartın tıklanması durumunda ürün sayfasına git
    router.push(`/urun/${product.slug}`)
  }

  return (
    <div 
      className="group bg-white cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      data-testid="product-card"
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        <Link href={`/urun/${product.slug}`}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        </Link>
        
        {/* Badges - Minimal style */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.is_new && (
            <span className="bg-black text-white text-xs px-2 py-1 uppercase tracking-wide">New</span>
          )}
          {product.is_best_seller && (
            <span className="bg-orange-500 text-white text-xs px-2 py-1 uppercase tracking-wide">
              Best Seller
            </span>
          )}
          {product.original_price && product.original_price > product.price && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 uppercase tracking-wide">
              -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
            </span>
          )}
        </div>

        {/* Quick actions - Hidden by default, show on hover */}
        <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}>
          <button
            onClick={handleToggleFavorite}
            className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white transition-colors"
          >
            <Heart 
              className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-black'}`} 
            />
          </button>
          <button 
            className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAddToCart}
            disabled={!product.in_stock || isLoading}
          >
            <ShoppingCart className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Stock Status */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-black text-sm font-light uppercase tracking-wide">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product Info - Minimal Zara style */}
      <div className="p-3 space-y-1">
        <Link href={`/urun/${product.slug}`}>
          <h3 className="font-light text-black text-sm line-clamp-2 leading-tight hover:text-gray-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-gray-400 text-xs uppercase tracking-wide">{product.brand}</p>
        
        {/* Rating - Minimal */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${
                i < Math.floor(product.rating)
                  ? 'text-black'
                  : 'text-gray-300'
              }`}
            />
          ))}
          <span className="text-xs text-gray-400 ml-1">({product.reviews_count})</span>
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
