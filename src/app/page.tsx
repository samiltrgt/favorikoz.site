import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'
import FeaturesSection from '@/components/features-section'
import DeferredHomeProductsBryhel from '@/components/deferred-home-products-bryhel'
import EditorialProductRows from '@/components/EditorialProductRows'
import FixedPromoCarousel, { type CarouselProduct } from '@/components/FixedPromoCarousel'
import HomeEditorialStack from '@/components/home-editorial-stack'
import { getHomeSections, type HomeProduct } from '@/lib/home-data'
import { formatTRY } from '@/lib/price'
import { brandMarqueeWhiteLogos } from '@/lib/site-brands'
import { getSiteUrl } from '@/lib/site-url'

function toPromoCarouselProduct(product: HomeProduct): CarouselProduct | null {
  const image = product.image?.trim()
  if (!image || !product.slug) return null
  const outOfStock =
    product.in_stock === false ||
    (typeof product.stock_quantity === 'number' && product.stock_quantity <= 0)
  const compare =
    product.original_price != null && product.original_price > product.price
      ? `₺${formatTRY(product.original_price)}`
      : undefined
  const previous = product.original_price
  const discount =
    previous != null && previous > product.price
      ? Math.round(((previous - product.price) / previous) * 100)
      : 0
  const images = Array.isArray(product.images)
    ? product.images.filter((src: unknown): src is string => typeof src === 'string' && src.length > 0)
    : undefined

  return {
    id: product.id,
    name: product.name,
    href: `/urun/${product.slug}`,
    slug: product.slug,
    image,
    imageAlt: product.name,
    brand: product.brand?.trim() || undefined,
    price: product.price,
    originalPrice: product.original_price,
    rating: typeof product.rating === 'number' ? product.rating : undefined,
    reviewsCount: typeof product.reviews_count === 'number' ? product.reviews_count : undefined,
    isNew: product.is_new === true,
    isBestSeller: product.is_best_seller === true,
    images,
    displayPrice: `₺${formatTRY(product.price)}`,
    displayComparePrice: compare,
    discountLabel: discount > 0 ? `-${discount}%` : undefined,
    actionLabel: outOfStock ? 'Stok Yok' : 'Sepete Ekle',
    actionDisabled: outOfStock,
  }
}

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

export const revalidate = 60

export default async function HomePage() {
  const {
    ownProductionProducts,
    promoCarouselProducts,
    marqueeBrands,
    editorialCategories,
    campaignBanners,
    homeLayout,
  } = await getHomeSections()

  const fixedPromoProducts = promoCarouselProducts
    .map(toPromoCarouselProduct)
    .filter((item): item is CarouselProduct => item !== null)

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-background">
      <Header />
      
      <main>
        <HomeEditorialStack
          brands={marqueeBrands}
          whiteLogos={brandMarqueeWhiteLogos}
          banners={campaignBanners}
        />

        {fixedPromoProducts.length > 0 && (
          <div className="section-content-visibility">
            <FixedPromoCarousel
              promo={{
                title: homeLayout.featured.title,
                description: homeLayout.featured.description,
                ctaLabel: homeLayout.featured.ctaLabel,
                href: homeLayout.featured.href,
              }}
              products={fixedPromoProducts}
            />
          </div>
        )}

        <div className="section-content-visibility">
          <FeaturesSection />
        </div>

        {/* 2c. Editorial kategori ürün satırları (mevcut banner/carousel'ın yerine geçmez) */}
        {editorialCategories.length > 0 && (
          <div className="section-content-visibility">
            <EditorialProductRows categories={editorialCategories} loop={false} />
          </div>
        )}

        {/* 4. Bryhel tarzı Our Products */}
        <div className="section-content-visibility">
        <DeferredHomeProductsBryhel
          products={ownProductionProducts}
          title={homeLayout.fontenay.title}
          subtitle={homeLayout.fontenay.subtitle}
          viewAllLink={homeLayout.fontenay.href}
          viewAllText={homeLayout.fontenay.cta}
        />
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
