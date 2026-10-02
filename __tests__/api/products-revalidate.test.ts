import { GET, POST } from '@/app/api/products/route'
import { DELETE, PUT } from '@/app/api/products/[id]/route'
import { revalidateProductCatalog } from '@/lib/product-cache'

const mockRevalidateTag = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  unstable_cache: (fn: unknown) => fn,
}))

jest.mock('next/server', () => ({
  NextRequest: class NextRequest {},
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: {
        get: (name: string) => init?.headers?.[name] ?? null,
      },
      json: async () => data,
    }),
  },
}))

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServer: jest.fn(async () => mockSupabase),
  createSupabaseAnon: jest.fn(() => mockSupabase),
}))

function queryResult(result: unknown) {
  const chain: any = {}
  const self = () => chain
  for (const method of ['select', 'is', 'eq', 'gt', 'in', 'order', 'limit', 'range', 'update', 'insert']) {
    chain[method] = jest.fn(self)
  }
  chain.single = jest.fn().mockResolvedValue(result)
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return chain
}

describe('product catalog cache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return queryResult({ data: { role: 'admin' }, error: null })
      }
      return queryResult({
        data: { id: 'p1', price: 5000, original_price: null, name: 'Urun' },
        error: null,
      })
    })
  })

  it('invalidates the products tag and catalog paths', () => {
    revalidateProductCatalog()

    expect(mockRevalidateTag).toHaveBeenCalledWith('products')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/urun/[slug]', 'page')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/kategori/[category]', 'page')
  })

  it('revalidates the products tag after an admin product update', async () => {
    const response = await PUT(
      { json: async () => ({ name: 'Yeni ad' }) } as any,
      { params: { id: 'p1' } }
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockRevalidateTag).toHaveBeenCalledWith('products')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('does not revalidate when the update is unauthorized', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const response = await PUT(
      { json: async () => ({ name: 'Yeni ad' }) } as any,
      { params: { id: 'p1' } }
    )

    expect(response.status).toBe(401)
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })

  it('revalidates after create and delete', async () => {
    const created = await POST({
      json: async () => ({ name: 'Yeni urun', price: 10 }),
    } as any)
    expect(created.status).toBe(200)
    expect(mockRevalidateTag).toHaveBeenCalledWith('products')

    mockRevalidateTag.mockClear()

    const removed = await DELETE({} as any, { params: { id: 'p1' } })
    expect(removed.status).toBe(200)
    expect(mockRevalidateTag).toHaveBeenCalledWith('products')
  })

  it('sets a public cache header on the catalog list and no-store for admin scope', async () => {
    mockSupabase.from.mockImplementation(() =>
      queryResult({ data: [], error: null })
    )

    const publicResponse = await GET({ url: 'http://localhost/api/products' } as any)
    expect(publicResponse.headers.get('Cache-Control')).toContain('s-maxage=60')
    expect(publicResponse.headers.get('Cache-Control')).toContain('public')

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return queryResult({ data: { role: 'admin' }, error: null })
      }
      return queryResult({ data: [], error: null })
    })

    const adminResponse = await GET({
      url: 'http://localhost/api/products?scope=admin',
    } as any)
    expect(adminResponse.headers.get('Cache-Control')).toBe('private, no-store')
  })
})
