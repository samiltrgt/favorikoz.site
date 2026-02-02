'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import ProductCardModern from './product-card-modern'

interface Product {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  original_price?: number | null
  image: string
  rating?: number
  reviews_count?: number
  in_stock?: boolean
}

interface OwnProductionProps {
  products: Product[]
}

export default function OwnProduction({ products }: OwnProductionProps) {
  const [displayProducts, setDisplayProducts] = useState<Product[]>([])
  const [brandType, setBrandType] = useState<'favori' | 'fontenay' | 'general'>('general')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/own-production')
        const json = await res.json()
        if (cancelled) return
        if (json.success && json.data?.length > 0) {
          const list = (json.data as any[])
            .map((row: any) => row.products)
            .filter(Boolean) as Product[]
          setDisplayProducts(list)
          setBrandType('general') // Admin seçimli; başlık "Öne Çıkan Ürünler" gibi genel kalır
        } else {
          // Fallback: markaya göre (Favori > Fontenay > ilk 8)
          const ownProducts = products.filter(p => p.brand?.toLowerCase().trim() === 'favori').slice(0, 8)
          const fontenayProducts = products.filter(p => p.brand?.toLowerCase().includes('fontenay')).slice(0, 8)
          let list = products.slice(0, 8)
          let type: 'favori' | 'fontenay' | 'general' = 'general'
          if (ownProducts.length > 0) {
            list = ownProducts
            type = 'favori'
          } else if (fontenayProducts.length > 0) {
            list = fontenayProducts
            type = 'fontenay'
          }
          setDisplayProducts(list)
          setBrandType(type)
        }
      } catch {
        if (cancelled) return
        const ownProducts = products.filter(p => p.brand?.toLowerCase().trim() === 'favori').slice(0, 8)
        const fontenayProducts = products.filter(p => p.brand?.toLowerCase().includes('fontenay')).slice(0, 8)
        let list = products.slice(0, 8)
        let type: 'favori' | 'fontenay' | 'general' = 'general'
        if (ownProducts.length > 0) {
          list = ownProducts
          type = 'favori'
        } else if (fontenayProducts.length > 0) {
          list = fontenayProducts
          type = 'fontenay'
        }
        setDisplayProducts(list)
        setBrandType(type)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [products])

  if (isLoading) return null
  if (displayProducts.length === 0) return null

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-br from-[hsl(36,33%,96%)] via-white to-[hsl(30,25%,90%)]">
      {/* Decorative background elements - Ecru/Beige/Powder tones */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[hsl(30,25%,90%)]/60 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-[hsl(10,40%,90%)]/50 to-transparent rounded-full blur-3xl" />
      
      <div className="container relative z-10">
        {/* Section Header - Ultra Modern */}
        <div className="text-center mb-16 space-y-6">
          {/* Badge - Site renkleri: Beige/Powder tones */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(30,25%,90%)]/70 rounded-full border border-[hsl(30,20%,85%)] backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-[hsl(24,15%,15%)]" />
            <span className="text-sm font-medium text-[hsl(24,15%,20%)] tracking-wide">Exclusive Collection</span>
          </div>
          
          {/* Main Title - Site renkleri: Dark cocoa to warm taupe */}
          <h2 className="text-5xl md:text-6xl font-light tracking-tight text-[hsl(24,15%,15%)]">
            {brandType === 'favori' ? (
              <>Kendi <span className="font-semibold bg-gradient-to-r from-[hsl(24,15%,15%)] via-[hsl(24,15%,35%)] to-[hsl(20,15%,50%)] bg-clip-text text-transparent">Üretimimiz</span></>
            ) : brandType === 'fontenay' ? (
              <><span className="font-semibold bg-gradient-to-r from-[hsl(24,15%,15%)] via-[hsl(24,15%,35%)] to-[hsl(20,15%,50%)] bg-clip-text text-transparent">Fontenay Paris</span></>
            ) : (
              <>Öne <span className="font-semibold bg-gradient-to-r from-[hsl(24,15%,15%)] via-[hsl(24,15%,35%)] to-[hsl(20,15%,50%)] bg-clip-text text-transparent">Çıkan Ürünler</span></>
            )}
          </h2>
          
          {/* Subtitle */}
          <p className="text-lg text-[hsl(24,10%,40%)] max-w-2xl mx-auto leading-relaxed">
            {brandType === 'favori' 
              ? 'Özenle tasarlanan, en kaliteli malzemelerle üretilen özel koleksiyonumuz'
              : brandType === 'fontenay'
              ? 'Sizin için özenle ürettiğimiz profesyonel ürünler'
              : 'Sizin için özenle seçtiğimiz premium kalite ürünler'
            }
          </p>
          
          {/* Decorative line - Site accent color */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-[2px] bg-gradient-to-r from-transparent to-[hsl(30,20%,85%)]" />
            <div className="w-2 h-2 rounded-full bg-[hsl(24,15%,15%)]" />
            <div className="w-12 h-[2px] bg-gradient-to-l from-transparent to-[hsl(30,20%,85%)]" />
          </div>
        </div>

        {/* Products Grid - Premium Design */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayProducts.map((product, index) => (
            <ProductCardModern key={product.id} product={product} index={index} showBrandBadge={true} />
          ))}
        </div>

        {/* View All Link - Site primary color */}
        <div className="text-center mt-12">
          <Link 
            href={
              brandType === 'favori' ? "/tum-urunler?brand=favori" 
              : brandType === 'fontenay' ? "/tum-urunler?brand=fontenay"
              : "/tum-urunler"
            }
            className="group inline-flex items-center gap-3 px-8 py-4 bg-[hsl(24,15%,15%)] hover:bg-[hsl(24,15%,20%)] text-white rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-300"
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
