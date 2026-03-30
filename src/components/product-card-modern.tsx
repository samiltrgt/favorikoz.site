'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Heart, ShoppingCart, Loader2 } from 'lucide-react'
import { toggleFavorite, isFavorite } from '@/lib/favorites'
import { addToCart } from '@/lib/cart'

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
  compact?: boolean
}

export default function ProductCardModern({ product, index = 0, showBrandBadge = true, compact = false }: ProductCardModernProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFavoriteState, setIsFavoriteState] = useState(false)
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
  const [isCartLoading, setIsCartLoading] = useState(false)

  // Load favorite status from API (Supabase)
  useEffect(() => {
    let cancelled = false
    isFavorite(product.id).then((fav) => {
      if (!cancelled) setIsFavoriteState(fav)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [product.id])

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavoriteLoading(true)
    try {
      const result = await toggleFavorite(product.id)
      if (result.success) setIsFavoriteState(result.isFavorite)
      else if (result.error?.toLowerCase().includes('giriş')) {
        if (typeof window !== 'undefined' && confirm('Favorilere eklemek için giriş yapmanız gerekiyor. Giriş sayfasına yönlendirilsin mi?'))
          window.location.href = '/giris'
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
    } finally {
      setIsFavoriteLoading(false)
    }
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.in_stock === false) return
    setIsCartLoading(true)
    try {
      // API fiyatı /10 formatında; sepette 10x (kuruş benzeri) kullanılıyor
      addToCart({
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        price: product.price * 10,
        qty: 1,
      })
    } finally {
      setIsCartLoading(false)
    }
  }

  const discount = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0

  return (
    <div
      className={`group relative bg-white overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 animate-fade-in-up border border-gray-100 ${compact ? 'rounded-xl' : 'rounded-2xl'}`}
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <Link href={`/urun/${product.slug}`} className={`block relative overflow-hidden bg-gray-50 ${compact ? 'aspect-[5/6]' : 'aspect-square'}`}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
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
          className={`absolute left-3 right-3 flex items-center gap-2 transition-all duration-300 ${compact ? 'bottom-2 gap-1.5' : 'bottom-3 gap-2'} ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={isFavoriteLoading}
            aria-label={isFavoriteState ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            className={`flex-1 flex items-center justify-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl hover:bg-[hsl(30,25%,90%)] transition-colors shadow-lg disabled:opacity-70 ${compact ? 'px-2 py-1.5' : 'px-4 py-2.5'}`}
          >
            {isFavoriteLoading ? (
              <Loader2 className={`animate-spin text-[hsl(24,10%,40%)] ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            ) : (
              <Heart className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isFavoriteState ? 'fill-[hsl(24,15%,15%)] text-[hsl(24,15%,15%)]' : 'text-[hsl(24,10%,40%)]'}`} />
            )}
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isCartLoading || product.in_stock === false}
            aria-label="Sepete ekle"
            className={`flex-1 flex items-center justify-center gap-2 bg-[hsl(24,15%,15%)] text-white rounded-xl hover:bg-[hsl(24,15%,20%)] hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed ${compact ? 'px-2 py-1.5' : 'px-4 py-2.5'}`}
          >
            {isCartLoading ? (
              <Loader2 className={`animate-spin ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            ) : (
              <ShoppingCart className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            )}
          </button>
        </div>
      </Link>

      {/* Product Info */}
      <div className={compact ? 'px-2 py-1.5 space-y-0.5' : 'p-4 space-y-2'}>
        <Link href={`/urun/${product.slug}`}>
          <h3 className={`font-medium text-[hsl(24,15%,15%)] leading-tight line-clamp-2 hover:text-[hsl(24,15%,35%)] transition-colors ${compact ? 'text-[11px] leading-snug min-h-0' : 'text-sm min-h-[2.5rem]'}`}>
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${
                  i < Math.floor(product.rating || 0)
                    ? 'text-[hsl(24,15%,15%)] fill-[hsl(24,15%,15%)]'
                    : 'text-[hsl(30,20%,85%)]'
                }`}
              />
            ))}
          </div>
          <span className={`text-[hsl(24,10%,40%)] ${compact ? 'text-[10px]' : 'text-xs'}`}>
            ({product.reviews_count || 0})
          </span>
        </div>

        {/* Price */}
        <div className={`flex items-center gap-2 ${compact ? 'pt-0.5' : 'pt-1'}`}>
          <span className={`font-bold text-[hsl(24,15%,15%)] ${compact ? 'text-sm' : 'text-xl'}`}>
            ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className={`text-[hsl(24,10%,40%)] line-through ${compact ? 'text-xs' : 'text-sm'}`}>
              ₺{product.original_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Border on Hover - Site border color */}
      <div className={`absolute inset-0 border-2 border-transparent group-hover:border-[hsl(24,15%,15%)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${compact ? 'rounded-xl' : 'rounded-2xl'}`} />
    </div>
  )
}
