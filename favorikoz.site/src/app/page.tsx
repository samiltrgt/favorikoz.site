import Header from '@/components/header'
import Footer from '@/components/footer'
import HeroSection from '@/components/hero-section'
import FeaturesSection from '@/components/features-section'
import HomeBanners from '@/components/home-banners'
import FeaturedProducts from '@/components/featured-products'
import ShadeGuideSection from '@/components/shade-guide-section'
import { readProducts } from '@/lib/database'

export default function HomePage() {
  const products = readProducts()
  const newProducts = products.filter((product: any) => product.isNew).slice(0, 4)
  const bestSellers = products.filter((product: any) => product.isBestSeller).slice(0, 4)
  
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
        
        {/* Featured Products */}
        <FeaturedProducts
          title="Çok Satanlar"
          subtitle="Müşterilerimizin favorisi olan ve olağanüstü sonuçlar veren ürünler"
          products={products}
          viewAllLink="/tum-urunler"
          section="bestSellers"
        />
        
        {/* Shade Guide Section */}
        <ShadeGuideSection />
        
        {/* New Products */}
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
