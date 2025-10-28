import Header from '@/components/header'
import Footer from '@/components/footer'
import HeroSection from '@/components/hero-section'
import FeaturesSection from '@/components/features-section'
import HomeBanners from '@/components/home-banners'
import FeaturedProducts from '@/components/featured-products'
import ShadeGuideSection from '@/components/shade-guide-section'
import { createSupabaseServer } from '@/lib/supabase/server'

export const revalidate = 10 // Revalidate every 10 seconds (for admin changes to show faster)

export default async function HomePage() {
  let products: any[] = []
  
  try {
    const supabase = await createSupabaseServer()
    
    // Fetch products from Supabase
    const { data: allProducts } = await supabase
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .limit(1000)
    
    // Convert price from kuruş to TL
    products = (allProducts || []).map(p => ({
      ...p,
      price: p.price / 100,
      original_price: p.original_price ? p.original_price / 100 : null,
    }))
  } catch (error) {
    console.error('Failed to fetch products:', error)
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

        {/* Editorial Banners */}
        <HomeBanners />
        
        {/* Featured Products - Best Sellers */}
        <FeaturedProducts
          title="Çok Satanlar"
          subtitle="Müşterilerimizin favorisi olan ve olağanüstü sonuçlar veren ürünler"
          products={products}
          viewAllLink="/tum-urunler"
          section="bestSellers"
        />
        
        {/* Shade Guide Section */}
        <ShadeGuideSection />
        
        {/* Featured Products - New Products */}
        <FeaturedProducts
          title="Yeni Ürünler"
          subtitle="Güzellik rutininiz için taze gelenler"
          products={products}
          viewAllLink="/tum-urunler"
          section="newProducts"
        />
      </main>
      
      <Footer />
    </div>
  )
}
