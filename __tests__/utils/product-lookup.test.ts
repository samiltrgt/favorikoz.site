const maybeSingle = jest.fn()
jest.mock('react', () => ({ ...jest.requireActual('react'), cache: (fn: unknown) => fn }))
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAnon: () => ({ from: () => ({ select: () => ({ eq: () => ({ is: () => ({ maybeSingle }) }) }) }) }) }))

import { getProductBySlug } from '@/lib/get-product-by-slug'
import { optimizedImageSource } from '@/lib/responsive-image-server'
import imageManifest from '@/data/optimized-images.json'

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
  it('resolves page image references on the server while preserving unknown sources', async () => {
    const source = Object.keys(imageManifest)[0]
    const unknown = 'https://example.com/new-catalog-image.jpg'
    maybeSingle.mockResolvedValueOnce({ data: { id: '1', slug: 'existing', in_stock: true, stock_quantity: 1, price: 12995, original_price: null, image: source, images: [source, unknown, null] }, error: null })
    expect(await getProductBySlug('existing')).toMatchObject({ image: optimizedImageSource(source), images: [optimizedImageSource(source), unknown] })
  })
})
