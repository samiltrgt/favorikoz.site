import { Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import Footer from '@/components/footer'
import AllProductsClient from '@/components/all-products-client'
import ViewItemListTracker from '@/components/view-item-list-tracker'
import { getAllProducts } from '@/lib/category-products'

export const revalidate = 60

function Breadcrumbs() {
  return (
    <nav className="bg-gray-50 py-3">
      <div className="container">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-black transition-colors">
            Anasayfa
          </Link>
          <span>/</span>
          <span className="text-black font-medium">Tüm Ürünler</span>
        </div>
      </div>
    </nav>
  )
}

export default async function AllProductsPage() {
  const products = await getAllProducts()

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Breadcrumbs />

      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 py-8">
        {/* İlk liste SSR — JS kapalıyken ürün adları HTML'de görünür */}
        <noscript>
          <h1 className="text-3xl font-light text-black mb-4">Tüm Ürünler</h1>
          <p className="text-gray-600 text-sm mb-8">{products.length} ürün bulundu</p>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {products.slice(0, 40).map((p) => (
              <li key={p.id}>
                <Link href={`/urun/${p.slug}`} className="block text-sm text-black">
                  {p.name}
                </Link>
                <span className="text-xs text-gray-500">
                  {p.price.toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  TL
                </span>
              </li>
            ))}
          </ul>
        </noscript>

        <Suspense
          fallback={
            <div className="w-full">
              <h1 className="text-3xl font-light text-black mb-2">Tüm Ürünler</h1>
              <p className="text-gray-600 text-sm mb-8">{products.length} ürün bulundu</p>
              <div className="grid grid-cols-2 max-[360px]:grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6">
                {products.slice(0, 40).map((product) => (
                  <div key={product.id} className="text-sm text-black">
                    <Link href={`/urun/${product.slug}`}>{product.name}</Link>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <AllProductsClient products={products} />
        </Suspense>
        <ViewItemListTracker
          itemListId="all_products"
          itemListName="Tüm Ürünler"
          items={products.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
        />
      </div>

      <Footer />
    </div>
  )
}
