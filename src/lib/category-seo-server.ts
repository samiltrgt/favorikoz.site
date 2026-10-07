import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPublicCategories } from '@/lib/categories-server'
import { resolveCategoryChain, categoryPath, categoryCopy, categoryCanonical, legacyCategoryRedirect } from '@/lib/category-seo'
import { getCategoryProducts, getSubcategoryProducts } from '@/lib/category-products'
import { collectDescendantSlugsFromFlat } from '@/lib/category-tree'
import { catalogPage, CATALOG_PAGE_SIZE, isCatalogVariant, type CatalogSearchParams } from '@/lib/seo/catalog'
import { isPreviewDeployment } from '@/lib/site-url'

export const getCategoryPageData = cache(async (pathKey: string) => {
  const slugs = pathKey.split('/')
  const { flat } = await getPublicCategories()
  const chain = resolveCategoryChain(flat, slugs)
  if (!chain) {
    const redirect = legacyCategoryRedirect(flat, slugs)
    if (redirect) permanentRedirect(redirect)
    notFound()
  }
  const leaf = chain[chain.length - 1]
  const products = chain.length === 1
    ? await getCategoryProducts(slugs[0])
    : await getSubcategoryProducts(slugs[0], collectDescendantSlugsFromFlat(flat, leaf.slug))
  return { chain, flat, leaf, products, path: categoryPath(slugs), copy: categoryCopy(chain) }
})

export async function categoryMetadata(slugs: string[], searchParams: CatalogSearchParams = {}): Promise<Metadata> {
  const { path, copy, products } = await getCategoryPageData(slugs.join('/'))
  // Validate before emitting metadata as well as in the page. This shares the
  // cached read and prevents a valid canonical for an out-of-range page.
  const { page } = categoryPageItems(products, searchParams)
  const index = !isPreviewDeployment() && !isCatalogVariant(searchParams)
  return {
    title: { absolute: `${copy.title}${page > 1 ? ` – Sayfa ${page}` : ''} | Favori Kozmetik` },
    description: copy.description,
    alternates: { canonical: categoryCanonical(path, page) },
    robots: { index, follow: true, googleBot: { index, follow: true } },
  }
}

export function categoryPageItems<T>(products: T[], params: CatalogSearchParams) {
  const page = catalogPage(params.page)
  const pages = Math.max(1, Math.ceil(products.length / CATALOG_PAGE_SIZE))
  if (page > pages) notFound()
  return { page, pages, items: products.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE) }
}
