import type { MetadataRoute } from 'next'
import { MENU_SORT_SLUG } from '@/lib/category-sort-config'

type SitemapRow = { slug: string; parent_slug?: string | null; updated_at?: string | null }
type QueryResult = { data: SitemapRow[] | null; count: number | null; error: unknown }

/** Handles server row limits smaller than the requested range. */
export async function loadSitemapRows(fetchPage: (from: number, to: number) => PromiseLike<QueryResult>): Promise<SitemapRow[]> {
  const rows: SitemapRow[] = []
  while (true) {
    const result = await fetchPage(rows.length, rows.length + 499)
    if (result.error || !result.data || result.count === null) throw new Error('Sitemap catalog query failed')
    rows.push(...result.data)
    if (rows.length >= result.count) return rows
    if (!result.data.length) throw new Error('Sitemap catalog query returned an incomplete range')
  }
}

function timestamp(value?: string | null): { lastModified?: Date } {
  if (!value) return {}
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? {} : { lastModified: date }
}

export function buildCatalogSitemap(baseUrl: string, categories: SitemapRow[], products: SitemapRow[]): MetadataRoute.Sitemap {
  categories = categories.filter((category) => category.slug !== MENU_SORT_SLUG)
  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/tum-urunler`, changeFrequency: 'daily', priority: 0.9 },
    ...['hakkimizda', 'kargo-iade', 'gizlilik', 'cerez-politikasi', 'kullanim-kosullari', 'kvkk']
      .map((path) => ({ url: `${baseUrl}/${path}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
  ]
  const bySlug = new Map(categories.map((category) => [category.slug, category]))
  for (const category of categories) {
    const path = [category.slug]
    let parent = category.parent_slug
    const seen = new Set(path)
    while (parent) {
      const ancestor = bySlug.get(parent)
      if (!ancestor || seen.has(parent)) break
      path.unshift(parent)
      seen.add(parent)
      parent = ancestor.parent_slug
    }
    if (parent) continue
    entries.push({ url: `${baseUrl}/kategori/${path.map(encodeURIComponent).join('/')}`,
      ...timestamp(category.updated_at), changeFrequency: 'weekly', priority: 0.8 })
  }
  for (const product of products) {
    if (!product.slug) continue
    entries.push({ url: `${baseUrl}/urun/${encodeURIComponent(product.slug)}`,
      ...timestamp(product.updated_at), changeFrequency: 'weekly', priority: 0.7 })
  }
  const seen = new Set<string>()
  return entries.filter(({url}) => { if (seen.has(url)) return false; seen.add(url); return true })
}
