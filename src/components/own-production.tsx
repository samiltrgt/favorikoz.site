'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import ProductCard from './product-card'

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
    <section className="relative py-20 overflow-hidden bg-gradient-to-br from-brand-paper via-brand-surface to-brand-mist">
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-brand-bloom/50 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-brand-rose/20 to-transparent rounded-full blur-3xl" />
      
      <div className="container relative z-10">
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-mist/80 rounded-full border border-[var(--color-border-hex)] backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-brand-ink" />
            <span className="text-sm font-medium text-brand-ink tracking-wide">Exclusive Collection</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-light tracking-tight text-brand-ink">
            <span className="font-semibold bg-gradient-to-r from-brand-ink via-brand-rose-deep to-brand-rose bg-clip-text text-transparent">Fontenay Paris</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Sizin için özenle ürettiğimiz profesyonel kalite ürünlerimiz
          </p>
          
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-[2px] bg-gradient-to-r from-transparent to-brand-rose-soft" />
            <div className="w-2 h-2 rounded-full bg-brand-rose" />
            <div className="w-12 h-[2px] bg-gradient-to-l from-transparent to-brand-rose-soft" />
          </div>
        </div>

        <div className="grid grid-cols-2 max-[360px]:grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6">
          {displayProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} showBrandBadge={true} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link 
            href={
              brandType === 'favori' ? "/tum-urunler?brand=favori" 
              : brandType === 'fontenay' ? "/tum-urunler?brand=fontenay"
              : "/tum-urunler"
            }
            className="group inline-flex items-center gap-3 px-8 py-4 bg-brand-rose hover:bg-brand-rose-deep text-white rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-300"
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
