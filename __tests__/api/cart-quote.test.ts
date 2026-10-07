import { POST } from '@/app/api/cart/quote/route'
import { createSupabaseAdmin } from '@/lib/supabase/server'

jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, options?: { status?: number; headers?: HeadersInit }) => ({ status: options?.status ?? 200, headers: options?.headers, json: async () => body }) },
}))
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: jest.fn() }))

function request(items: unknown[]) {
  return { json: async () => ({ items }) } as any
}

describe('cart quote', () => {
  const inProducts = jest.fn()
  const isNotDeleted = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(createSupabaseAdmin).mockReturnValue({
      from: () => ({ select: () => ({ in: (...args: unknown[]) => { inProducts(...args); return { is: (...isArgs: unknown[]) => { isNotDeleted(...isArgs); return Promise.resolve({ data: [{ id: 'p1', price: 14999, in_stock: true, stock_quantity: 10 }], error: null }) } } } }) }),
    } as any)
  })

  it('quotes the current database price in kuruş and ignores a stale client price', async () => {
    const response = await POST(request([{ id: 'p1', quantity: 2, price: 1 }]))
    expect(await response.json()).toEqual({ success: true, data: { canonicalItems: [{ id: 'p1', unitPriceKurus: 14999, quantity: 2 }], subtotalKurus: 29998 } })
    expect(inProducts).toHaveBeenCalledWith('id', ['p1'])
    expect(isNotDeleted).toHaveBeenCalledWith('deleted_at', null)
    expect((response.headers as unknown as Record<string, string>)?.['Cache-Control']).toBe('no-store')
  })

  it('rejects unavailable products', async () => {
    jest.mocked(createSupabaseAdmin).mockReturnValue({
      from: () => ({ select: () => ({ in: () => ({ is: async () => ({ data: [{ id: 'p1', price: 14999, in_stock: false, stock_quantity: 10 }], error: null }) }) }) }),
    } as any)
    const response = await POST(request([{ id: 'p1' }]))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('stok dışı')
  })

  it('rejects duplicate product lines before querying stock', async () => {
    const response = await POST(request([{ id: 'p1', quantity: 6 }, { id: 'p1', quantity: 6 }]))
    expect(response.status).toBe(400)
    expect(createSupabaseAdmin).not.toHaveBeenCalled()
  })
})
