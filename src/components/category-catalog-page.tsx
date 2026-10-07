import Link from 'next/link'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CategoryProductList from '@/components/category-product-list'
import ViewItemListTracker from '@/components/view-item-list-tracker'
import { getCategoryPageData, categoryPageItems } from '@/lib/category-seo-server'
import { categoryPath, categoryHref, sortCategoryProducts } from '@/lib/category-seo'
import { getSiteUrl } from '@/lib/site-url'
import type { CatalogSearchParams } from '@/lib/seo/catalog'

export default async function CategoryCatalogPage({ slugs, searchParams = {} }: { slugs: string[]; searchParams?: CatalogSearchParams }) {
  const { chain, flat, leaf, products, path, copy } = await getCategoryPageData(slugs.join('/'))
  const { page, pages, items } = categoryPageItems(sortCategoryProducts(products, searchParams.sort), searchParams)
  const breadcrumbs = [
    { name: 'Anasayfa', path: '/' },
    { name: 'Tüm Ürünler', path: '/tum-urunler' },
    ...chain.map((row, index) => ({ name: row.name.trim(), path: categoryPath(slugs.slice(0, index + 1)) })),
  ]
  const origin = getSiteUrl()
  const schema = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: `${origin}${crumb.path}` })) },
    { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: items.map((product, index) => ({ '@type': 'ListItem', position: index + 1, name: product.name, url: `${origin}/urun/${product.slug}` })) },
  ]
  const children = flat.filter((row) => row.parent_slug === leaf.slug)
  const pageHref = (number: number) => categoryHref(path, number, searchParams.sort)
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      <main className="pt-24 pb-16 mx-auto w-full max-w-[1440px] px-4 md:px-6">
        <nav aria-label="Kategori yolu" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.path} className="inline-flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {index === breadcrumbs.length - 1 ? <span aria-current="page" className="text-black">{crumb.name}</span> : <Link href={crumb.path} className="hover:text-black">{crumb.name}</Link>}
            </span>
          ))}
        </nav>
        <h1 className="text-3xl md:text-4xl font-light text-black mb-3">{leaf.name.trim()}</h1>
        <p className="text-gray-600 mb-4">{copy.description}</p>
        {children.length > 0 && <nav aria-label="Alt kategoriler" className="flex flex-wrap gap-3 mb-6">{children.map((child) => <Link key={child.slug} href={categoryPath([...slugs, child.slug])} className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:border-black">{child.name.trim()}</Link>)}</nav>}
        <p className="text-gray-600 mb-8">{products.length} ürün bulundu{pages > 1 ? ` · Sayfa ${page} / ${pages}` : ''}</p>
        <CategoryProductList products={items} sortBy={Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort} emptyHref={chain.length > 1 ? categoryPath(slugs.slice(0, -1)) : '/tum-urunler'} emptyLinkLabel="Diğer ürünleri inceleyin" />
        {pages > 1 && <nav aria-label="Ürün sayfaları" className="my-8 flex items-center justify-center gap-6">{page > 1 && <Link href={pageHref(page - 1)} rel="prev" className="underline">Önceki sayfa</Link>}<span>{page} / {pages}</span>{page < pages && <Link href={pageHref(page + 1)} rel="next" className="underline">Sonraki sayfa</Link>}</nav>}
        {copy.guide && page === 1 && <section aria-labelledby="category-guide" className="mt-12 border-t border-gray-200 pt-8 max-w-4xl">
          <h2 id="category-guide" className="text-2xl font-medium mb-4">{copy.guide.heading}</h2>
          <p className="text-gray-700 leading-relaxed mb-6">{copy.guide.intro}</p>
          {copy.guide.sections.map((section) => <div key={section.heading} className="mb-6"><h3 className="text-lg font-medium mb-2">{section.heading}</h3><p className="text-gray-700 leading-relaxed">{section.text}</p></div>)}
          {chain.length > 1 && <Link className="underline" href={categoryPath(slugs.slice(0, -1))}>{chain[chain.length - 2].name.trim()} kategorisindeki diğer ürün grupları</Link>}
        </section>}
        <ViewItemListTracker itemListId={`category_${leaf.slug}_page_${page}`} itemListName={leaf.name.trim()} items={items.map((product) => ({ id: product.id, name: product.name, price: product.price }))} />
      </main>
      <Footer />
    </div>
  )
}
