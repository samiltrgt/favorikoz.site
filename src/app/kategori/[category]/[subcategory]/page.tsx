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
import { getPublicCategories } from '@/lib/categories-server'
import { collectDescendantSlugsFromFlat } from '@/lib/category-tree'

export const revalidate = 60

type Props = { params: Promise<{ category: string; subcategory: string }> }

export default async function SubcategoryPage({ params }: Props) {
  const { category: categorySlug, subcategory: subcategorySlug } = await params

  const [{ flat }, categoryName, subcategoryName] = await Promise.all([
    getPublicCategories(),
    getCategoryNameBySlug(categorySlug),
    getCategoryNameBySlug(subcategorySlug),
  ])

  const subcategorySlugs = collectDescendantSlugsFromFlat(flat, subcategorySlug)
  const products = await getSubcategoryProducts(categorySlug, subcategorySlugs)

  const catTitle = categoryName || categorySlug
  const subTitle = subcategoryName || subcategorySlug

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-24 pb-16">
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
          <nav className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-black">Anasayfa</Link>
              <span>/</span>
              <Link href="/tum-urunler" className="hover:text-black">Tüm Ürünler</Link>
              <span>/</span>
              <Link href={`/kategori/${categorySlug}`} className="hover:text-black">
                {catTitle}
              </Link>
              <span>/</span>
              <span className="text-black">{subTitle}</span>
            </div>
          </nav>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Link
                href={`/kategori/${categorySlug}`}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                {catTitle}&apos;e Dön
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-light text-black mb-2">{subTitle}</h1>
            <p className="text-gray-600">{products.length} ürün bulundu</p>
          </div>

          <CategoryProductList
            products={products}
            emptyTitle="Bu alt kategoride ürün bulunamadı"
            emptyHref={`/kategori/${categorySlug}`}
            emptyLinkLabel={`${catTitle}'e Dön`}
          />
          <ViewItemListTracker
            itemListId={`subcategory_${subcategorySlug}`}
            itemListName={subTitle}
            items={products.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}
