const range = jest.fn()
jest.mock('react', () => ({ ...jest.requireActual('react'), cache: (fn: unknown) => fn }))
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAnon: () => ({ from: () => ({ select: () => ({ eq: () => ({ order: () => ({ order: () => ({ range }) }) }) }) }) }) }))

import { getProductSeoReviews } from '@/lib/product-seo-server'

const review = (id: string, rating: number) => ({ id, verified: false, rating, comment: 'Gerçek müşteri yorumu', created_at: '2026-01-01', guest_name: 'Müşteri', profiles: null })

describe('Product review pagination', () => {
  beforeEach(() => range.mockReset())
  it('continues using actual received offsets when the server caps pages below500', async () => {
    range.mockResolvedValueOnce({ data: [review('a', 5)], count: 3, error: null })
      .mockResolvedValueOnce({ data: [review('b', 3)], count: null, error: null })
      .mockResolvedValueOnce({ data: [review('c', 4)], count: null, error: null })
    const rows = await getProductSeoReviews('product')
    expect(rows).toHaveLength(3)
    expect(range.mock.calls).toEqual([[0, 499], [1, 500], [2, 501]])
  })
  it('reports a database outage separately from having no reviews', async () => {
    range.mockResolvedValueOnce({ data: null, count: null, error: { code: '08006' } })
    await expect(getProductSeoReviews('product')).rejects.toThrow('Product reviews lookup failed')
  })
})
