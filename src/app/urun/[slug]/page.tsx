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
  const rating = product.rating
  const reviewsCount = product.reviews_count ?? 0

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <ProductViewTracker productId={product.id} name={product.name} price={product.price} />

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
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-semibold">
                      {typeof rating === 'number' ? rating.toFixed(1) : rating}
                    </span>
                  </div>
                  <span>·</span>
                  <span className="font-medium">{reviewsCount} değerlendirme</span>
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

            {product.description && (
              <details className="rounded-xl border border-gray-200 overflow-hidden group">
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
          <ProductReviews productId={product.id} productName={product.name} />
        </div>
      </div>

      <Footer />
    </div>
  )
}
