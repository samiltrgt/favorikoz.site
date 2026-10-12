import { getHomeSections } from '@/lib/home-data'
import { loadHomeLayoutConfig, DEFAULT_HOME_LAYOUT } from '@/lib/home-layout'
import { createSupabaseAnon } from '@/lib/supabase/server'

jest.mock('next/cache', () => ({ unstable_cache: (fn: (...args: any[]) => any) => {
  const entries = new Map()
  return (...args: any[]) => {
    const key = JSON.stringify(args)
    if (!entries.has(key)) entries.set(key, fn(...args))
    return entries.get(key)
  }
} }))
jest.mock('@/lib/home-layout', () => ({ ...jest.requireActual('@/lib/home-layout'), loadHomeLayoutConfig: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAnon: jest.fn(), createSupabaseAdmin: jest.fn() }))
jest.mock('@/lib/responsive-image-server', () => ({ optimizedImageSource: (src: string) => src }))

const products = ['old', 'new'].map(id => ({ id, slug: id, name: id, image: '/product.jpg', price: 10000, in_stock: true, stock_quantity: 10, category_slug: 'tirnak' }))
let failSelectedProducts = false
const layout = (ids: string[], title = 'Tırnak') => ({ ...DEFAULT_HOME_LAYOUT, rows: DEFAULT_HOME_LAYOUT.rows.map(row => ({ ...row, title: row.slug === 'tirnak' ? title : row.title, productIds: row.slug === 'tirnak' ? ids : [] })) })

beforeAll(() => {
  jest.mocked(createSupabaseAnon).mockReturnValue({ from: (table: string) => {
    let rows = table === 'products' ? products : []
    let selectedQuery = false
    const query: any = {
      select: () => query, is: () => query, gt: () => query, order: () => query, limit: () => query,
      eq: (key: string, value: unknown) => { rows = rows.filter((p: any) => p[key] === value); return query },
      in: (_key: string, ids: string[]) => { selectedQuery = true; rows = rows.filter(p => ids.includes(p.id)); return query },
      then: (resolve: any) => Promise.resolve(failSelectedProducts && selectedQuery
        ? { data: null, error: { message: 'temporary failure' } } : { data: rows, error: null }).then(resolve),
    }
    return query
  } } as any)
})

it('uses newly saved category picks and their order even when an older homepage entry is cached', async () => {
  jest.mocked(loadHomeLayoutConfig).mockResolvedValue(layout(['old']))
  expect((await getHomeSections()).editorialCategories[0].products.map(p => p.id)).toEqual(['old'])
  jest.mocked(loadHomeLayoutConfig).mockResolvedValue(layout(['new', 'old'], 'Yeni seçim'))
  const fresh = await getHomeSections()
  expect(fresh.editorialCategories[0].title).toBe('Yeni seçim')
  expect(fresh.editorialCategories[0].products.map(p => p.id)).toEqual(['new', 'old'])
})

it('does not hide a configuration outage behind a previously cached or automatic product list', async () => {
  jest.mocked(loadHomeLayoutConfig).mockRejectedValue(new Error('layout unavailable'))
  await expect(getHomeSections()).rejects.toThrow('layout unavailable')
})

it('does not cache an empty curated category after a selected product query fails', async () => {
  jest.mocked(loadHomeLayoutConfig).mockResolvedValue(layout(['new'], 'Query failure'))
  failSelectedProducts = true
  await expect(getHomeSections()).rejects.toThrow('Selected homepage products unavailable')
  failSelectedProducts = false
})
