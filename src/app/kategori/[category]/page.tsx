import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CategoryProductList from '@/components/category-product-list'
import ViewItemListTracker from '@/components/view-item-list-tracker'
import { getCategoryNameBySlug, getCategoryProducts } from '@/lib/category-products'

export const revalidate = 60

type Props = { params: Promise<{ category: string }> }

export default async function CategoryPage({ params }: Props) {
  const { category: categorySlug } = await params
  const [categoryName, products] = await Promise.all([
    getCategoryNameBySlug(categorySlug),
    getCategoryProducts(categorySlug),
  ])
  const title = categoryName || categorySlug

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
              <span className="text-black">{title}</span>
            </div>
          </nav>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Link
                href="/tum-urunler"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Geri Dön
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-light text-black mb-2">{title}</h1>
            <p className="text-gray-600">{products.length} ürün bulundu</p>
          </div>

          <CategoryProductList products={products} />
          <ViewItemListTracker
            itemListId={`category_${categorySlug}`}
            itemListName={title}
            items={products.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}
