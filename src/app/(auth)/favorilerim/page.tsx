'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingCart, Star, ArrowLeft } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { getFavorites, toggleFavorite } from '@/lib/favorites'
import { addToCart } from '@/lib/cart'

export default function FavoritesPage() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    setIsLoading(true)
    try {
      const ids = await getFavorites()
      setFavoriteIds(ids)

      if (ids.length === 0) {
        setProducts([])
        setIsLoading(false)
        return
      }

      // Fetch product details
      const response = await fetch('/api/products')
      const result = await response.json()

      if (result.success) {
        const favoriteProducts = result.data.filter((p: any) => ids.includes(p.id))
        setProducts(favoriteProducts)
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFavorite = async (productId: string) => {
    setRemovingId(productId)
    try {
      const result = await toggleFavorite(productId)
      if (result.success) {
        // Remove from local state
        setProducts(products.filter(p => p.id !== productId))
        setFavoriteIds(favoriteIds.filter(id => id !== productId))
      }
    } catch (error) {
      console.error('Error removing favorite:', error)
    } finally {
      setRemovingId(null)
    }
  }

  const handleAddToCart = (product: any) => {
    if (!product.in_stock) return
    addToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: product.price * 10, // API'den /10 formatında geliyor, sepete 10x formatında kaydediyoruz
      qty: 1,
    })
    // Show notification or feedback
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container py-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Favoriler yükleniyor...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Anasayfaya Dön</span>
          </Link>
          <h1 className="text-3xl font-bold text-black">Favorilerim</h1>
          <p className="text-gray-600 mt-2">
            {products.length > 0
              ? `${products.length} ürün favorilerinizde`
              : 'Henüz favori ürününüz yok'}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Favori ürününüz yok
            </h2>
            <p className="text-gray-600 mb-6">
              Beğendiğiniz ürünleri favorilerinize ekleyerek daha sonra kolayca bulabilirsiniz.
            </p>
            <Link
              href="/tum-urunler"
              className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden">
                  <Link href={`/urun/${product.slug}`}>
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </Link>

                  {/* Remove from favorites button */}
                  <button
                    onClick={() => handleRemoveFavorite(product.id)}
                    disabled={removingId === product.id}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-colors disabled:opacity-50"
                    title="Favorilerden çıkar"
                  >
                    <Heart
                      className={`w-5 h-5 fill-red-500 text-red-500 ${
                        removingId === product.id ? 'animate-pulse' : ''
                      }`}
                    />
                  </button>

                  {/* Stock badge */}
                  {!product.in_stock && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <span className="text-black text-sm font-light uppercase tracking-wide">
                        Stokta Yok
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-2">
                  <Link href={`/urun/${product.slug}`}>
                    <h3 className="font-light text-black text-sm line-clamp-2 leading-tight hover:text-gray-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-gray-400 text-xs uppercase tracking-wide">
                    {product.brand}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(product.rating)
                            ? 'text-black fill-black'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">
                      ({product.reviews_count || 0})
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-light text-black">
                      ₺
                      {product.price.toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    {product.original_price &&
                      product.original_price > product.price && (
                        <span className="text-xs text-gray-400 line-through">
                          ₺
                          {product.original_price.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                  </div>

                  {/* Add to cart button */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.in_stock}
                    className="w-full mt-3 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {product.in_stock ? 'Sepete Ekle' : 'Stokta Yok'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

