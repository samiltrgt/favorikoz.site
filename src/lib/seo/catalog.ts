export type CatalogSearchParams = Record<string, string | string[] | undefined>
export const CATALOG_PAGE_SIZE = 40
export function catalogPage(value?: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : 1
}
export function isCatalogVariant(params: CatalogSearchParams): boolean {
  return ['search', 'brand', 'sort', 'filter'].some((key) => Boolean(params[key]))
}
export function catalogCanonical(page: number): string {
  return page > 1 ? `/tum-urunler?page=${page}` : '/tum-urunler'
}
export function catalogHref(params: URLSearchParams, page: number): string {
  const query = new URLSearchParams(params)
  query.delete('page')
  if (page > 1) query.set('page', String(page))
  const suffix = query.toString()
  return `/tum-urunler${suffix ? `?${suffix}` : ''}`
}

export function catalogString(value?: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() || ''
}

type CatalogItem = { id: string; slug: string; name: string; brand?: string; price: number; rating?: number; created_at?: string }

/** Filtering and global sorting precede slicing, so SSR and hydrated pages agree. */
export function selectCatalogPage<T extends CatalogItem>(products: T[], params: CatalogSearchParams) {
  const searchQuery = catalogString(params.search)
  const brandFilter = catalogString(params.brand)
  const allowedSorts = ['newest', 'oldest', 'price-low', 'price-high', 'rating', 'name-asc', 'name-desc']
  const rawSort = catalogString(params.sort)
  const sortBy = allowedSorts.includes(rawSort) ? rawSort : 'newest'
  const page = catalogPage(params.page)
  const query = searchQuery.toLocaleLowerCase('tr')
  const brand = brandFilter.toLocaleLowerCase('tr')
  const matching = products.filter((product) =>
    (!query || [product.name, product.brand || '', product.slug].some((value) => value.toLocaleLowerCase('tr').includes(query))) &&
    (!brand || (product.brand || '').toLocaleLowerCase('tr').includes(brand)))
  function date(value?: string) {
    const result = new Date(value || 0).getTime()
    return Number.isNaN(result) ? 0 : result
  }
  matching.sort((a, b) => {
    let result = 0
    switch (sortBy) {
      case 'oldest': result = date(a.created_at) - date(b.created_at); break
      case 'price-low': result = a.price - b.price; break
      case 'price-high': result = b.price - a.price; break
      case 'rating': result = (b.rating || 0) - (a.rating || 0); break
      case 'name-asc': result = a.name.localeCompare(b.name, 'tr'); break
      case 'name-desc': result = b.name.localeCompare(a.name, 'tr'); break
      default: result = date(b.created_at) - date(a.created_at)
    }
    return result || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  })
  const totalCount = matching.length
  const totalPages = Math.max(1, Math.ceil(totalCount / CATALOG_PAGE_SIZE))
  const title = searchQuery ? `"${searchQuery}" için arama sonuçları` : brandFilter ? `${brandFilter.charAt(0).toLocaleUpperCase('tr') + brandFilter.slice(1)} Ürünleri` : 'Tüm Ürünler'
  return { pageItems: matching.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE), totalCount, totalPages, page, searchQuery, brandFilter, sortBy, title, outOfRange: page > totalPages }
}
