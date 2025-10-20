"use client"

import Image from 'next/image'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Minus, Plus, Heart, Truck, ShieldCheck, RefreshCcw, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { addToCart } from '@/lib/cart'
import { toggleFavorite, isFavorite } from '@/lib/favorites'
import Header from '@/components/header'
import Footer from '@/components/footer'

type Params = { slug: string }

export default function ProductDetailPage({ params }: { params: Params }) {
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch('/api/products')
        const result = await response.json()
        if (result.success) {
          const foundProduct = result.data.find((p: any) => p.slug === params.slug)
          if (foundProduct) {
            setProduct(foundProduct)
          }
        }
      } catch (error) {
        console.error('Error loading product:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProduct()
  }, [params.slug])

  // Combine main image with additional images
  const allImages = product ? [product.image, ...(product.images || [])].filter(Boolean) : []
  
  // Navigation functions
  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % allImages.length)
  }
  
  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }
  
  // Keyboard navigation
  useEffect(() => {
    if (!product || allImages.length <= 1) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevImage()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextImage()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [product, allImages.length])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ürün yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!product) return notFound()

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <nav className="bg-gray-50 py-3">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-black">Anasayfa</Link>
            <span>/</span>
            <Link href="/tum-urunler" className="hover:text-black">Tüm Ürünler</Link>
            <span>/</span>
            <span className="text-black line-clamp-1">{product.name}</span>
          </div>
        </div>
      </nav>

      <div className="container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative w-full aspect-square bg-gray-50 overflow-hidden rounded-xl group">
              <Image
                src={allImages[selectedImageIndex]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              
              {/* Navigation Buttons */}
              {allImages.length > 1 && (
                <>
                  {/* Previous Button */}
                  <button
                    onClick={prevImage}
                    className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Önceki görsel"
                  >
                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  
                  {/* Next Button */}
                  <button
                    onClick={nextImage}
                    className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Sonraki görsel"
                  >
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  
                  {/* Image Counter */}
                  <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-black bg-opacity-50 text-white px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {selectedImageIndex + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>
            
            {/* Thumbnail Images */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      selectedImageIndex === index 
                        ? 'border-black ring-2 ring-black ring-opacity-20' 
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} - Görsel ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-8 lg:sticky lg:top-24 h-fit">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-wider text-gray-500 font-medium">{product.brand}</p>
              <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight tracking-tight">{product.name}</h1>
              {product.barcode && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold">Ürün Kodu:</span>
                  <span className="bg-gray-100 px-3 py-1 rounded-md font-mono font-bold text-gray-800">
                    {product.barcode}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-end gap-4 mb-4">
                <span className="text-4xl font-bold text-black">₺{(product.price / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {product.originalPrice && (
                  <span className="text-xl text-gray-400 line-through">₺{(product.originalPrice / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                )}
                {product.discount && product.discount > 0 && (
                  <span className="text-sm bg-red-100 text-red-600 font-bold px-2 py-1 rounded-full">-%{product.discount}</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-semibold">{product.rating?.toFixed?.(1) || product.rating}</span>
                  </div>
                  <span>·</span>
                  <span className="font-medium">{product.reviews} değerlendirme</span>
                  {product.inStock === false && (
                    <>
                      <span>·</span>
                      <span className="text-red-600 font-semibold">Stokta yok</span>
                    </>
                  )}
                </div>
                <FavButton id={product.id} />
              </div>
            </div>

            {/* Quantity + Actions */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <QuantitySelector onChange={(q:number)=>setQty(q)} />
                <button
                  disabled={!product.inStock}
                  onClick={() => {
                    if (!product.inStock) return
                    addToCart({ id: product.id, slug: product.slug, name: product.name, image: product.image, price: product.price, qty })
                    setAdded(true)
                    setTimeout(()=>setAdded(false), 1500)
                  }}
                  className={`flex-1 h-14 rounded-xl transition-all duration-300 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed ${added ? 'bg-green-600 text-white scale-105' : product.inStock ? 'bg-black text-white hover:bg-gray-800 hover:scale-105 active:scale-95' : 'bg-gray-400 text-white'}`}
                >
                  {added ? (
                    <span className="inline-flex items-center gap-2">
                      <Check className="w-5 h-5" /> 
                      Eklendi!
                    </span>
                  ) : product.inStock ? (
                    'Sepete Ekle'
                  ) : (
                    'Stokta Yok'
                  )}
                </button>
              </div>
              <div className="flex items-center">
                <Link href="/tum-urunler" className="flex-1 h-12 inline-flex items-center justify-center rounded-xl border-2 border-gray-300 text-base font-semibold text-gray-900 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300">
                  Alışverişe Devam Et
                </Link>
              </div>
            </div>

            {product.description && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
                  className="w-full flex items-center justify-between p-6 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  <h2 className="text-lg font-bold text-black">Ürün Açıklaması</h2>
                  {isDescriptionOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${isDescriptionOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-6 pt-0">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line font-medium text-base">
                      {product.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors duration-200">
                <ShieldCheck className="w-6 h-6 text-green-600" />
                <span className="font-semibold text-gray-800 text-center">Güvenli Ödeme</span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors duration-200">
                <Truck className="w-6 h-6 text-blue-600" />
                <span className="font-semibold text-gray-800 text-center">24 Saatte Kargo</span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors duration-200">
                <RefreshCcw className="w-6 h-6 text-purple-600" />
                <span className="font-semibold text-gray-800 text-center">14 Gün İade</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

function QuantitySelector({ onChange }: { onChange?: (qty: number)=>void }) {
  const [qty, setQty] = useState(1)
  const set = (val: number) => {
    setQty(val)
    onChange?.(val)
  }
  return (
    <div className="inline-flex items-center border-2 border-gray-300 rounded-xl overflow-hidden h-14 bg-white">
      <button
        type="button"
        className="w-12 h-full grid place-items-center hover:bg-gray-100 transition-colors duration-200"
        onClick={() => set(Math.max(1, qty - 1))}
        aria-label="Azalt"
      >
        <Minus className="w-5 h-5" />
      </button>
      <div className="w-12 text-center text-lg font-bold select-none text-gray-900">{qty}</div>
      <button
        type="button"
        className="w-12 h-full grid place-items-center hover:bg-gray-100 transition-colors duration-200"
        onClick={() => set(Math.min(99, qty + 1))}
        aria-label="Artır"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  )
}

function FavButton({ id }: { id: string }) {
  const [fav, setFav] = useState(isFavorite(id))
  return (
    <button
      onClick={() => setFav(toggleFavorite(id))}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-semibold ${
        fav 
          ? 'text-red-600 bg-red-50 hover:bg-red-100' 
          : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
      }`}
    >
      <Heart className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} /> 
      <span className="text-sm">{fav ? 'Favorilerde' : 'Favorilere ekle'}</span>
    </button>
  )
}


