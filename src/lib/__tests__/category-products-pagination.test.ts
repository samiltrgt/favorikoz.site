jest.mock('react', () => ({ ...jest.requireActual('react'), cache: (fn: unknown) => fn }))
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAnon: jest.fn() }))
import { createSupabaseAnon } from '@/lib/supabase/server'
import { getAllProducts, getCategoryNameBySlug } from '../category-products'

describe('complete category product pagination', () => {
  test('a server cap below the requested range cannot truncate the catalog', async () => {
    const records = Array.from({ length: 7 }, (_, index) => ({ id: String(index), slug: `p${index}`, name: `Product ${index}`, price: 1000 }))
    const offsets: number[] = []
    const builder: any = {}
    for (const method of ['select', 'is', 'eq', 'gt', 'order']) builder[method] = jest.fn(() => builder)
    builder.range = jest.fn((from: number) => {
      offsets.push(from)
      return Promise.resolve({ data: records.slice(from, from + 2), count: records.length, error: null })
    })
    ;(createSupabaseAnon as jest.Mock).mockReturnValue({ from: () => builder })
    const result = await getAllProducts()
    expect(result.map((row) => row.id)).toEqual(records.map((row) => row.id))
    expect(offsets).toEqual([0, 2, 4, 6])
    expect(builder.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' })
  })
  test('catalog read failure propagates instead of producing a false empty category', async () => {
    const builder: any = {}
    for (const method of ['select', 'is', 'eq', 'gt', 'order']) builder[method] = () => builder
    builder.range = () => Promise.resolve({ data: null, count: null, error: new Error('connection failed') })
    ;(createSupabaseAnon as jest.Mock).mockReturnValue({ from: () => builder })
    await expect(getAllProducts()).rejects.toThrow('connection failed')
  })
  test('category name read errors propagate rather than masquerading as missing', async () => {
    const builder: any = {}
    for (const method of ['select', 'is', 'eq']) builder[method] = () => builder
    builder.maybeSingle = () => Promise.resolve({ data: null, error: new Error('database offline') })
    ;(createSupabaseAnon as jest.Mock).mockReturnValue({ from: () => builder })
    await expect(getCategoryNameBySlug('tirnak')).rejects.toThrow('database offline')
  })
})
