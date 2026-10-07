import { getSiteUrl, isPreviewDeployment } from '@/lib/site-url'
import { buildCatalogSitemap, loadSitemapRows } from '@/lib/seo/sitemap'
import { catalogPage, catalogCanonical, catalogHref, isCatalogVariant, selectCatalogPage } from '@/lib/seo/catalog'

const originalEnv = { ...process.env }
afterEach(() => { process.env = { ...originalEnv } })

test('canonical origin rejects request-like deployment and local origins', () => {
  process.env.NEXT_PUBLIC_BASE_URL = 'https://www.favorikozmetik.com/path?test=1'
  process.env.VERCEL_URL = 'preview-123.vercel.app'
  expect(getSiteUrl()).toBe('https://www.favorikozmetik.com')
  for (const origin of ['http://localhost:3000', 'https://preview.vercel.app', 'javascript:alert(1)', 'https://user:pass@example.com', 'https://127.0.0.1']) {
    process.env.NEXT_PUBLIC_BASE_URL = origin
    expect(getSiteUrl()).toBe('https://www.favorikozmetik.com')
  }
  process.env.NEXT_PUBLIC_BASE_URL = 'https://shop.example.com/'
  expect(getSiteUrl()).toBe('https://shop.example.com')
})

test('Vercel preview cannot be indexed', () => {
  process.env.VERCEL_ENV = 'preview'
  expect(isPreviewDeployment()).toBe(true)
  process.env.VERCEL_ENV = 'production'
  expect(isPreviewDeployment()).toBe(false)
})

test('pagination reads complete catalog despite a lower server row limit', async () => {
  const rows = Array.from({ length: 1205 }, (_, i) => ({ slug: `product-${i}` }))
  const offsets: number[] = []
  const result = await loadSitemapRows(async (from) => {
    offsets.push(from)
    return { data: rows.slice(from, from + 100), count: rows.length, error: null }
  })
  expect(result).toEqual(rows)
  expect(offsets).toHaveLength(13)
  expect(offsets.at(-1)).toBe(1200)
})

test('database errors and incomplete ranges do not masquerade as complete sitemap', async () => {
  await expect(loadSitemapRows(async () => ({ data: null, count: null, error: { message: 'unavailable' } }))).rejects.toThrow()
  await expect(loadSitemapRows(async () => ({ data: [], count: 20, error: null }))).rejects.toThrow('incomplete')
})

test('sitemap includes sold-out products, skips private routes and does not fabricate update dates', () => {
  const date = '2026-10-01T10:00:00Z'
  const result = buildCatalogSitemap('https://shop.example.com', [
    { slug: 'nails', updated_at: date },
    { slug: 'gel', parent_slug: 'nails' },
    { slug: 'builder', parent_slug: 'gel' },
    { slug: 'orphan', parent_slug: 'removed' },
    { slug: 'loop', parent_slug: 'loop' },
    { slug: '_menu_sort' },
  ], [{ slug: 'sold-out', updated_at: date }, { slug: 'date-unknown', updated_at: 'invalid' }])
  expect(result.some(({ url }) => url.endsWith('/urun/sold-out'))).toBe(true)
  expect(result.some(({ url }) => url.endsWith('/kategori/nails/gel/builder'))).toBe(true)
  expect(result.some(({ url }) => /checkout|sepet|giris|orphan|loop|_menu_sort/.test(url))).toBe(false)
  expect(result[0].lastModified).toBeUndefined()
  expect(result.find(({ url }) => url.endsWith('/urun/date-unknown'))?.lastModified).toBeUndefined()
  expect(result.find(({ url }) => url.endsWith('/kategori/nails'))?.lastModified).toEqual(new Date(date))
})

test('pagination has self canonicals and preserves search state in crawlable links', () => {
  expect(catalogCanonical(1)).toBe('/tum-urunler')
  expect(catalogCanonical(2)).toBe('/tum-urunler?page=2')
  expect(catalogHref(new URLSearchParams('brand=Test&page=3'), 2)).toBe('/tum-urunler?brand=Test&page=2')
  expect(isCatalogVariant({ page: '2' })).toBe(false)
  expect(isCatalogVariant({ search: 'oje' })).toBe(true)
  expect(isCatalogVariant({ sort: 'price-low' })).toBe(true)
  expect(catalogPage('-2')).toBe(1)
  expect(catalogPage('2')).toBe(2)
  expect(catalogPage('2.5')).toBe(1)
})

test('HTTP rules leave public indexing neutral and prevent private/preview indexing', async () => {
  const config = require('../../next.config.js')
  process.env.VERCEL_ENV = 'production'
  const production = await config.headers()
  expect(production.find((rule: {source: string}) => rule.source === '/(.*)').headers.some((header: {key: string}) => header.key === 'X-Robots-Tag')).toBe(false)
  for (const route of ['sepet', 'checkout', 'payment', 'giris', 'kayit', 'hesabim', 'siparislerim', 'favorilerim']) {
    expect(production.find((rule: {source: string}) => rule.source === `/${route}/:path*`).headers).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex, follow' })
  }
  process.env.VERCEL_ENV = 'preview'
  const preview = await config.headers()
  expect(preview[0].headers).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex, follow' })
})

test('catalog filters and global sort precede pagination without mutating source products', () => {
  const products = Array.from({ length: 100 }, (_, i) => ({
    id: String(i), slug: `oje-${i}`, name: `Oje ${i}`, brand: i % 2 ? 'Other' : 'Test',
    price: 100 - i, created_at: '2026-10-01',
  }))
  const result = selectCatalogPage(products, { brand: 'Test', search: 'oje', sort: 'price-low', page: '2' })
  expect(result.totalCount).toBe(50)
  expect(result.totalPages).toBe(2)
  expect(result.pageItems).toHaveLength(10)
  expect(result.pageItems[0].id).toBe('18')
  expect(result.pageItems[9].id).toBe('0')
  expect(products[0].id).toBe('0')
  expect(result.outOfRange).toBe(false)
  expect(selectCatalogPage(products, { brand: 'Test', page: '3' }).outOfRange).toBe(true)
})

test('empty filtered page1 remains useful but subsequent empty result pages are invalid', () => {
  const products = [{ id: '1', slug: 'oje', name: 'Oje', brand: 'Test', price: 10 }]
  const first = selectCatalogPage(products, { search: 'nonexistent' })
  expect(first.totalCount).toBe(0)
  expect(first.pageItems).toEqual([])
  expect(first.outOfRange).toBe(false)
  expect(selectCatalogPage(products, { search: 'nonexistent', page: '2' }).outOfRange).toBe(true)
  expect(selectCatalogPage(products, { search: ['oje', 'unused'] }).totalCount).toBe(1)
})
