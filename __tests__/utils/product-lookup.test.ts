const maybeSingle = jest.fn()
jest.mock('react', () => ({ ...jest.requireActual('react'), cache: (fn: unknown) => fn }))
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAnon: () => ({ from: () => ({ select: () => ({ eq: () => ({ is: () => ({ maybeSingle }) }) }) }) }) }))

import { getProductBySlug } from '@/lib/get-product-by-slug'

describe('Product lookup failure and stock behavior', () => {
  it('distinguishes a missing product from a database failure', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    await expect(getProductBySlug('missing')).resolves.toBeNull()
    maybeSingle.mockResolvedValueOnce({ data: null, error: { code: '08006' } })
    await expect(getProductBySlug('existing')).rejects.toThrow('Product lookup failed')
  })
  it('does not offer a product when its inventory is exhausted', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { id: '1', slug: 'existing', in_stock: true, stock_quantity: 0, price: 12995, original_price: null, images: null }, error: null })
    expect(await getProductBySlug('existing')).toMatchObject({ in_stock: false, price: 129.95 })
  })
})
