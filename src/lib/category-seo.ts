import type { CategoryTreeRow } from '@/lib/category-tree'
import { CATEGORY_SEO } from '@/data/category-seo'
import type { CategoryListProduct } from '@/lib/category-products'

/** Resolve only the exact public ancestry; a real slug under a wrong parent is not a page. */
export function resolveCategoryChain(rows: CategoryTreeRow[], slugs: string[]): CategoryTreeRow[] | null {
  if (!slugs.length) return null
  const chain: CategoryTreeRow[] = []
  for (const slug of slugs) {
    const row = rows.find((item) => item.slug === slug && !item.deleted_at)
    if (!row || (row.parent_slug ?? null) !== (chain.at(-1)?.slug ?? null)) return null
    chain.push(row)
  }
  return chain
}

export function categoryPath(slugs: string[]): string {
  return `/kategori/${slugs.map(encodeURIComponent).join('/')}`
}

/** Previous routes accepted root/leaf shortcuts. Preserve only verified descendants. */
export function legacyCategoryRedirect(rows: CategoryTreeRow[], slugs: string[]): string | null {
  if (slugs.length !== 2 || resolveCategoryChain(rows, slugs)) return null
  const [rootSlug, leafSlug] = slugs
  const root = rows.find((row) => row.slug === rootSlug && !row.deleted_at && !row.parent_slug)
  if (!root) return null
  const ancestry: string[] = []
  const visited = new Set<string>()
  let cursor: string | null = leafSlug
  while (cursor) {
    if (visited.has(cursor)) return null
    visited.add(cursor)
    const matches = rows.filter((row) => row.slug === cursor && !row.deleted_at)
    if (matches.length !== 1) return null
    const row = matches[0]
    ancestry.unshift(row.slug)
    if (row.slug === rootSlug) return ancestry.length > 2 ? categoryPath(ancestry) : null
    cursor = row.parent_slug ?? null
  }
  return null
}

export function categoryCopy(chain: CategoryTreeRow[]) {
  const leaf = chain[chain.length - 1]
  const override = CATEGORY_SEO[leaf.slug]
  return {
    title: override?.title ?? `${leaf.name.trim()} Ürünleri`,
    description: override?.description ?? `${leaf.name.trim()} ürünlerini marka ve fiyat bilgileriyle karşılaştırın.${chain.length > 1 ? ` ${chain[chain.length - 2].name.trim()} kategorisindeki seçenekleri inceleyin.` : ' Alt kategorilerden ihtiyacınıza uygun ürün grubunu seçin.'}`,
    guide: override,
  }
}

export function categoryCanonical(path: string, page: number): string {
  return `${path}${page > 1 ? `?page=${page}` : ''}`
}

export function categoryHref(path: string, page: number, sort?: string | string[]): string {
  const params = new URLSearchParams()
  const value = Array.isArray(sort) ? sort[0] : sort
  if (value && value !== 'newest') params.set('sort', value)
  if (page > 1) params.set('page', String(page))
  return `${path}${params.size ? `?${params.toString()}` : ''}`
}

/** Order the complete result before slicing a page, using IDs to break ties. */
export function sortCategoryProducts(products: CategoryListProduct[], sort?: string | string[]): CategoryListProduct[] {
  const value = Array.isArray(sort) ? sort[0] : sort
  return [...products].sort((a, b) => {
    let comparison = 0
    switch (value) {
      case 'price-low': comparison = a.price - b.price; break
      case 'price-high': comparison = b.price - a.price; break
      case 'rating': comparison = (b.rating ?? 0) - (a.rating ?? 0); break
      case 'name': comparison = a.name.localeCompare(b.name, 'tr'); break
      default: comparison = new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    }
    return comparison || a.id.localeCompare(b.id)
  })
}
