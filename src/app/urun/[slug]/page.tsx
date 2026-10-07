import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Truck, ShieldCheck, RefreshCcw, ChevronDown } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import ProductReviews from '@/components/product-reviews'
import ProductGallery from '@/components/product-gallery'
import ProductPurchase, { FavButton } from '@/components/product-purchase'
import ProductViewTracker from '@/components/product-view-tracker'
import { getPopularProductSlugs, getProductBySlug } from '@/lib/get-product-by-slug'
import { formatTRY } from '@/lib/price'
import { getProductSeo, validProductReviews } from '@/lib/product-seo'
import { getProductBreadcrumbs, getProductSeoReviews, getRelatedProducts } from '@/lib/product-seo-server'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  try {
    return await getPopularProductSlugs(40)
  } catch {
    return []
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const allImages = [product.image, ...(product.images || [])].filter(Boolean) as string[]
  const [breadcrumbs, reviewRows, relatedProducts] = await Promise.all([getProductBreadcrumbs(product), getProductSeoReviews(product.id).catch(() => null), getRelatedProducts(product)])
  const reviewsUnavailable = reviewRows === null
  const reviews = validProductReviews(reviewRows || [])
  const reviewsCount = reviews.length
  const rating = reviewsCount ? reviews.reduce((sum, review) => sum + review.ratingValue, 0) / reviewsCount : null
  const { content } = getProductSeo(product)

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <ProductViewTracker productId={product.id} name={product.name} price={product.price} />

      <nav aria-label="Kategori yolu" className="bg-gray-50 py-3">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {breadcrumbs.map((item, index) => <span key={item.href} className="inline-flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {index === breadcrumbs.length - 1 ? <span aria-current="page" className="text-black line-clamp-1">{item.name}</span> : <Link href={item.href} className="hover:text-black">{item.name}</Link>}
            </span>)}
          </div>
        </div>
      </nav>

      <div className="container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <ProductGallery images={allImages} productName={product.name} />

          <div className="space-y-8 lg:sticky lg:top-24 h-fit">
            <div className="space-y-4">
              {product.brand && (
                <p className="text-sm uppercase tracking-wider text-gray-500 font-medium">{product.brand}</p>
              )}
              <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight tracking-tight">
                {product.name}
              </h1>
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
                <span className="text-4xl font-bold text-black">₺{formatTRY(product.price)}</span>
                {product.original_price != null && product.original_price > product.price && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      ₺{formatTRY(product.original_price)}
                    </span>
                    <span className="text-sm bg-red-100 text-red-600 font-bold px-2 py-1 rounded-full">
                      -%{Math.round(((product.original_price - product.price) / product.original_price) * 100)}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  {rating !== null && <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-semibold">
                      {rating.toFixed(1)}
                    </span>
                  </div>}
                  <span className="font-medium">{reviewsUnavailable ? 'Değerlendirmeler yüklenemedi' : reviewsCount ? `${reviewsCount} değerlendirme` : 'Henüz değerlendirme yok'}</span>
                  {product.in_stock === false && (
                    <>
                      <span>·</span>
                      <span className="text-red-600 font-semibold">Stokta yok</span>
                    </>
                  )}
                </div>
                <FavButton id={product.id} />
              </div>
            </div>

            <ProductPurchase
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                image: product.image,
                price: product.price,
                in_stock: product.in_stock,
              }}
            />

            {product.description && !content && (
              <details open className="rounded-xl border border-gray-200 overflow-hidden group">
                <summary className="w-full flex items-center justify-between p-6 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <h2 className="text-lg font-bold text-black">Ürün Açıklaması</h2>
                  <ChevronDown className="w-5 h-5 text-gray-600 transition-transform group-open:rotate-180" />
                </summary>
                <div className="p-6 pt-0">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line font-medium text-base">
                    {product.description}
                  </p>
                </div>
              </details>
            )}

            {content && <section className="rounded-xl border border-gray-200 p-6 space-y-4" aria-labelledby="product-guide-heading">
              <h2 id="product-guide-heading" className="text-lg font-bold">{content.heading}</h2>
              {content.paragraphs.map(paragraph => <p key={paragraph} className="text-gray-700 leading-relaxed">{paragraph}</p>)}
              <dl className="grid grid-cols-2 gap-3 text-sm">{content.facts.map(fact => <div key={fact.label}><dt className="font-semibold">{fact.label}</dt><dd className="text-gray-700">{fact.value}</dd></div>)}</dl>
              {content.selectionNote && <p className="text-sm text-gray-600">{content.selectionNote}</p>}
            </section>}

            {relatedProducts.length > 0 && <section className="rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-3">Aynı kategorideki ürünler</h2>
              <ul className="space-y-2">{relatedProducts.map(item => <li key={item.slug}><Link href={`/urun/${encodeURIComponent(item.slug)}`} className="text-gray-700 underline hover:text-black">{item.name}</Link></li>)}</ul>
            </section>}

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

        <div className="container max-w-6xl mx-auto px-4">
          <ProductReviews productId={product.id} productName={product.name} initialLoadError={reviewsUnavailable} initialReviews={reviews.map(review => ({ id: review.id!, verified: review.verified === true, author: review.author, rating: review.ratingValue, comment: review.reviewBody, date: new Date(review.datePublished).toLocaleDateString('tr-TR') }))} />
        </div>
      </div>

      <Footer />
    </div>
  )
}
