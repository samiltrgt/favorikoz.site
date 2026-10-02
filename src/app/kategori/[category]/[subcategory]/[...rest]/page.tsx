import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CategoryProductList from '@/components/category-product-list'
import ViewItemListTracker from '@/components/view-item-list-tracker'
import {
  getCategoryNameBySlug,
  getSubcategoryProducts,
} from '@/lib/category-products'

export const revalidate = 60

type Props = {
  params: Promise<{ category: string; subcategory: string; rest: string[] }>
}

export default async function DeepCategoryPage({ params }: Props) {
  const { category: categorySlug, subcategory: firstSubcategorySlug, rest = [] } =
    await params
  const leafSubcategorySlug = rest[rest.length - 1] || firstSubcategorySlug
  const chain = [categorySlug, firstSubcategorySlug, ...rest]

  const [products, ...names] = await Promise.all([
    getSubcategoryProducts(categorySlug, [leafSubcategorySlug]),
    ...chain.map((slug) => getCategoryNameBySlug(slug)),
  ])

  const nameBySlug: Record<string, string> = {}
  chain.forEach((slug, idx) => {
    nameBySlug[slug] = names[idx] || slug
  })

  const pageTitle = nameBySlug[leafSubcategorySlug] || leafSubcategorySlug
  const upPath =
    chain.length > 2
      ? `/kategori/${categorySlug}/${chain.slice(1, -1).join('/')}`
      : `/kategori/${categorySlug}`

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-24 pb-16">
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
          <nav className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-black">
                Anasayfa
              </Link>
              {chain.map((slug, idx) => {
                const isLast = idx === chain.length - 1
                const href =
                  idx === 0
                    ? `/kategori/${slug}`
                    : `/kategori/${categorySlug}/${chain.slice(1, idx + 1).join('/')}`
                return (
                  <span key={slug + idx} className="flex items-center gap-2">
                    <span>/</span>
                    {isLast ? (
                      <span className="text-black">{nameBySlug[slug] || slug}</span>
                    ) : (
                      <Link href={href} className="hover:text-black">
                        {nameBySlug[slug] || slug}
                      </Link>
                    )}
                  </span>
                )
              })}
            </div>
          </nav>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Link
                href={upPath}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Üst kategoriye dön
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-light text-black mb-2">{pageTitle}</h1>
            <p className="text-gray-600">{products.length} ürün bulundu</p>
          </div>

          <CategoryProductList
            products={products}
            emptyTitle="Bu kategoride ürün bulunamadı"
            emptyHref={upPath}
            emptyLinkLabel="Üst kategoriye dön"
          />
          <ViewItemListTracker
            itemListId={`deep_category_${leafSubcategorySlug}`}
            itemListName={pageTitle}
            items={products.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}
