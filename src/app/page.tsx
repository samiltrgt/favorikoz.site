import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'
import FeaturesSection from '@/components/features-section'
import DeferredHomeProductsBryhel from '@/components/deferred-home-products-bryhel'
import DeferredAdaptiveScrollHero from '@/components/deferred-adaptive-scroll-hero'
import DeferredProductsCarousel from '@/components/deferred-products-carousel'
import DeferredPromoBannerCarousel from '@/components/deferred-promo-banner-carousel'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: 'Favori Kozmetik - Premium Kozmetik Ürünleri',
  description:
    'Favori Kozmetik ile güzelliğinizi keşfedin. Protez tırnak, kalıcı makyaj, kişisel bakım, Fontenay Paris ve daha fazlası için güvenilir adresiniz.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Favori Kozmetik - Premium Kozmetik Ürünleri',
    description:
      'Favori Kozmetik ile güzelliğinizi keşfedin. Protez tırnak, kalıcı makyaj, kişisel bakım ve daha fazlası için güvenilir adresiniz.',
    url: siteUrl,
    type: 'website',
  },
}

export const dynamic = 'force-dynamic' // Force dynamic rendering because we use cookies
export const revalidate = 10 // Revalidate every 10 seconds (for admin changes to show faster)

export default async function HomePage() {
  let products: any[] = []
  
  try {
    const supabase = await createSupabaseServer()
    
    // Fetch products from Supabase (sadece stokta olanlar)
    const { data: allProducts, error: supabaseError } = await supabase
      .from('products')
      .select('id, slug, name, brand, price, original_price, image, rating, reviews_count, in_stock, stock_quantity, created_at, subcategory_slug, category_slug')
      .is('deleted_at', null)
      .eq('in_stock', true) // Müşterilere sadece stokta olan ürünleri göster
      .gt('stock_quantity', 0) // Stok miktarı 0'dan büyük olmalı
      .limit(120)
    
    if (supabaseError) {
      console.error('❌ Supabase error:', {
        message: supabaseError.message,
        details: supabaseError,
        code: supabaseError.code,
        hint: supabaseError.hint
      })
      // Fallback to empty array
      products = []
    } else {
    // Convert price from kuruş to TL, then divide by 10 for display
    products = (allProducts || []).map(p => ({
      ...p,
      price: (p.price / 100) / 10, // Kuruş → TL → /10
      original_price: p.original_price ? (p.original_price / 100) / 10 : null,
    }))
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch products:', {
      message: error?.message,
      error: error,
      stack: error?.stack
    })
    // Fallback to empty array
    products = []
  }
  
  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-gray-50">
      <Header />
      
      <main>
        {/* 1. Scroll animasyonlu hero - mobilde 1.5 viewport scroll, sticky hero */}
        <section className="relative w-full">
          <div className="min-h-[150vh] md:min-h-0 md:h-[100vh]">
            <div className="sticky top-0 h-[100vh] w-full">
              <DeferredAdaptiveScrollHero products={products} />
            </div>
          </div>
        </section>

        {/* 2. Ürünler carousel (oklarla) - mobilde üstte karartma gradient */}
        <section className="relative">
          <div
            className="absolute top-0 left-0 right-0 z-10 h-48 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-transparent md:hidden"
            aria-hidden
          />
          <DeferredProductsCarousel products={products} title="ÜRÜNLER" viewAllLink="/tum-urunler" />
        </section>

        {/* 2b. Features Section (4 ikon) */}
        <FeaturesSection />

        {/* 3. Banner carousel */}
        <DeferredPromoBannerCarousel products={products} />

        {/* 4. Bryhel tarzı Our Products */}
        <DeferredHomeProductsBryhel
          products={products}
          title="Fontenay Paris"
          viewAllLink="/tum-urunler"
          viewAllText="Tümünü Gör"
        />
      </main>
      
      <Footer />
    </div>
  )
}
