import Header from '@/components/header'
import Footer from '@/components/footer'
import HeroSection from '@/components/hero-section'
import FeaturesSection from '@/components/features-section'
import PromoBanner from '@/components/promo-banner'
import HomeBanners from '@/components/home-banners'
import FeaturedProducts from '@/components/featured-products'
import OwnProduction from '@/components/own-production'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic' // Force dynamic rendering because we use cookies
export const revalidate = 10 // Revalidate every 10 seconds (for admin changes to show faster)

export default async function HomePage() {
  let products: any[] = []
  
  try {
    const supabase = await createSupabaseServer()
    
    // Fetch products from Supabase (sadece stokta olanlar)
    const { data: allProducts, error: supabaseError } = await supabase
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .eq('in_stock', true) // Müşterilere sadece stokta olan ürünleri göster
      .gt('stock_quantity', 0) // Stok miktarı 0'dan büyük olmalı
      .limit(1000)
    
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main>
        {/* Hero Section */}
        <HeroSection />
        
        {/* Features Section */}
        <FeaturesSection />

        {/* Promo Banner - Top */}
        <PromoBanner position="top" />

        {/* Editorial Banners */}
        <HomeBanners />

        {/* Promo Banner - Bottom */}
        <PromoBanner position="bottom" />
        
        {/* Own Production - Kendi Üretimimiz */}
        <OwnProduction products={products} />
        
        {/* Featured Products - Best Sellers */}
        <FeaturedProducts
          title="Çok Satanlar"
          subtitle="Müşterilerimizin favorisi olan ve olağanüstü sonuçlar veren ürünler"
          products={products}
          viewAllLink="/tum-urunler"
          section="bestSellers"
        />

        {/* Promo Banner - Footer */}
        <PromoBanner position="footer" />
      </main>
      
      <Footer />
    </div>
  )
}
