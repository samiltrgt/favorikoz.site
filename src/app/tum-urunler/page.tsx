import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { catalogPage, catalogCanonical, isCatalogVariant, selectCatalogPage, type CatalogSearchParams } from '@/lib/seo/catalog'
import { isPreviewDeployment, getSiteUrl } from '@/lib/site-url'
import Link from 'next/link'
import Header from '@/components/header'
import Footer from '@/components/footer'
import AllProductsClient from '@/components/all-products-client'
import ViewItemListTracker from '@/components/view-item-list-tracker'
import { getAllProducts } from '@/lib/category-products'

export const revalidate = 60

export function generateMetadata({ searchParams }: { searchParams: CatalogSearchParams }): Metadata {
  const page = catalogPage(searchParams.page)
  const title = `Tüm Ürünler${page > 1 ? ` – Sayfa ${page}` : ''} | Favori Kozmetik`
  const description = 'Protez tırnak, saç bakımı, kişisel bakım, ipek kirpik ve kuaför malzemelerini Favori Kozmetik ürün kataloğunda inceleyin.'
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: catalogCanonical(page) },
    openGraph: { title, description, url: `${getSiteUrl()}${catalogCanonical(page)}`, type: 'website', locale: 'tr_TR', siteName: 'Favori Kozmetik' },
    twitter: { card: 'summary', title, description },
    robots: {
      index: !isPreviewDeployment() && !isCatalogVariant(searchParams), follow: true,
      googleBot: { index: !isPreviewDeployment() && !isCatalogVariant(searchParams), follow: true },
    },
  }
}

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

export default async function AllProductsPage({ searchParams }: { searchParams: CatalogSearchParams }) {
  const products = await getAllProducts()
  const catalog = selectCatalogPage(products, searchParams)
  if (catalog.outOfRange) notFound()
  const serverItems = catalog.pageItems

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Breadcrumbs />

      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 py-8">
        {/* İlk liste SSR — JS kapalıyken ürün adları HTML'de görünür */}
        <noscript>
          <h1 className="text-3xl font-light text-black mb-4">{catalog.title}</h1>
          <p className="text-gray-600 text-sm mb-8">{catalog.totalCount} ürün bulundu</p>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {serverItems.map((p) => (
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
              <h1 className="text-3xl font-light text-black mb-2">{catalog.title}</h1>
              <p className="text-gray-600 text-sm mb-8">{catalog.totalCount} ürün bulundu</p>
              <div className="grid grid-cols-2 max-[360px]:grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6">
                {serverItems.map((product) => (
                  <div key={product.id} className="text-sm text-black">
                    <Link href={`/urun/${product.slug}`}>{product.name}</Link>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <AllProductsClient pageItems={catalog.pageItems} totalCount={catalog.totalCount}
            totalPages={catalog.totalPages} page={catalog.page} searchQuery={catalog.searchQuery}
            brandFilter={catalog.brandFilter} sortBy={catalog.sortBy} />
        </Suspense>
        <ViewItemListTracker
          itemListId="all_products"
          itemListName="Tüm Ürünler"
          items={serverItems.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
        />
      </div>

      <Footer />
    </div>
  )
}
