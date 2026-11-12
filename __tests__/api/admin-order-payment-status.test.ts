import type { NextRequest } from 'next/server'
import { PUT } from '@/app/api/admin/orders/[id]/route'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import { tryProcessOrderNotifications } from '@/lib/email-notifications'
import { retractGoogleConversion } from '@/lib/analytics/google-retract'
import { noteMetaCancelUnverified } from '@/lib/analytics/meta-cancel'

jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, options?: { status?: number }) => ({
    status: options?.status ?? 200, json: async () => body,
  }) },
}))
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: jest.fn(), createSupabaseServer: jest.fn() }))
jest.mock('@/lib/email-notifications', () => ({ tryProcessOrderNotifications: jest.fn() }))
jest.mock('@/lib/analytics/google-retract', () => ({ retractGoogleConversion: jest.fn() }))
jest.mock('@/lib/analytics/meta-cancel', () => ({ noteMetaCancelUnverified: jest.fn() }))

type Order = {
  id: string
  order_number: string
  status: string
  payment_status: string
  tracking_number: string | null
  carrier: string | null
  updated_at: string
}
let storedOrder: Order | null
let lookupError: boolean
let writeError: boolean
let beforeWrite: (() => void) | undefined
let committedWrites: Record<string, unknown>[]
const update = jest.fn()
const db = { from: jest.fn(), rpc: jest.fn() }
const session = { auth: { getUser: jest.fn() }, from: jest.fn() }
const params = { params: { id: 'local-order' } }

function fixture(overrides: Partial<Order> = {}): Order {
  return {
    id: 'local-order', order_number: 'LOCAL-ORDER', status: 'paid', payment_status: 'completed',
    tracking_number: null, carrier: 'surat', updated_at: '2026-01-01T00:00:00.000Z', ...overrides,
  }
}

type QueryResult = { data: Order | null; error: { message: string } | null }
type OrderQuery = {
  select: () => OrderQuery
  eq: (key: string, value: unknown) => OrderQuery
  update: (value: Record<string, unknown>) => OrderQuery
  maybeSingle: () => Promise<QueryResult>
  single: () => Promise<QueryResult>
}

// Model a filtered UPDATE against current state, including a concurrent payment write.
function orderQuery(): OrderQuery {
  let payload: Record<string, unknown> | undefined
  const filters: Array<[string, unknown]> = []
  const resolve = async (): Promise<QueryResult> => {
    if (!payload && lookupError) return { data: null, error: { message: 'lookup failed' } }
    if (payload) {
      beforeWrite?.()
      if (writeError) return { data: null, error: { message: 'write failed' } }
    }
    if (!storedOrder || filters.some(([key, value]) => storedOrder![key as keyof Order] !== value)) {
      return { data: null, error: null }
    }
    if (payload) {
      committedWrites.push({ ...payload })
      storedOrder = { ...storedOrder, ...payload }
    }
    return { data: { ...storedOrder }, error: null }
  }
  const query: OrderQuery = {
    select: jest.fn(() => query),
    eq: jest.fn((key: string, value: unknown) => { filters.push([key, value]); return query }),
    update: (value: Record<string, unknown>) => { update(value); payload = value; return query },
    maybeSingle: resolve,
    single: resolve,
  }
  return query
}

function request(body: Record<string, unknown>) {
  return { json: async () => body } as NextRequest
}

function expectNoWriteOrEffects() {
  expect(update).not.toHaveBeenCalled()
  expect(committedWrites).toEqual([])
  expect(db.rpc).not.toHaveBeenCalled()
  expect(tryProcessOrderNotifications).not.toHaveBeenCalled()
  expect(retractGoogleConversion).not.toHaveBeenCalled()
  expect(noteMetaCancelUnverified).not.toHaveBeenCalled()
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  storedOrder = fixture()
  lookupError = false
  writeError = false
  beforeWrite = undefined
  committedWrites = []
  session.auth.getUser.mockResolvedValue({ data: { user: { id: 'local-admin' } } })
  session.from.mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) })
  jest.mocked(createSupabaseServer).mockResolvedValue(session as never)
  jest.mocked(createSupabaseAdmin).mockReturnValue(db as never)
  db.from.mockImplementation(orderQuery)
})
afterEach(() => jest.restoreAllMocks())

test('unauthenticated requests cannot access the privileged order client', async () => {
  session.auth.getUser.mockResolvedValue({ data: { user: null } })
  expect((await PUT(request({ payment_status: 'completed' }), params)).status).toBe(401)
  expect(createSupabaseAdmin).not.toHaveBeenCalled()
  expectNoWriteOrEffects()
})

test.each(['customer', null])('role %s cannot edit an order', async (role) => {
  session.from.mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: { role } }) }) }) })
  expect((await PUT(request({ payment_status: 'completed' }), params)).status).toBe(403)
  expect(createSupabaseAdmin).not.toHaveBeenCalled()
  expectNoWriteOrEffects()
})

test.each(['pending', 'failed', 'refunded', 'unknown'])('admin cannot complete payment from %s', async (payment_status) => {
  storedOrder = fixture({ payment_status, status: 'pending' })
  const original = { ...storedOrder }
  const response = await PUT(request({ payment_status: 'completed', status: 'paid', tracking_number: 'LOCAL-TRACK' }), params)
  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({ success: false })
  expect(storedOrder).toEqual(original)
  expectNoWriteOrEffects()
})

test.each([{ payment_status: 'invalid' }, { status: 'invalid' }])('invalid status remains rejected: %j', async (body) => {
  expect((await PUT(request(body), params)).status).toBe(400)
  expectNoWriteOrEffects()
})

test('repeated completed-only requests return the existing order without writes or notifications', async () => {
  const original = { ...storedOrder }
  for (let repeat = 0; repeat < 2; repeat++) {
    const response = await PUT(request({ payment_status: 'completed' }), params)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, data: original })
  }
  expect(storedOrder).toEqual(original)
  expectNoWriteOrEffects()
})

test('resubmitting the unchanged admin form is also a no-op', async () => {
  expect((await PUT(request({ status: 'paid', payment_status: 'completed', tracking_number: '', carrier: 'surat' }), params)).status).toBe(200)
  expectNoWriteOrEffects()
})

test('completed orders still accept shipping edits without rewriting payment or copying verification fields', async () => {
  const response = await PUT(request({ status: 'shipped', payment_status: 'completed', tracking_number: 'LOCAL-TRACK', carrier: 'local-carrier',
    payment_verified_at: 'forged', iyzico_payment_id: 'forged', tracking: { consent: { marketing: true } } }), params)
  expect(response.status).toBe(200)
  expect(storedOrder).toMatchObject({ status: 'shipped', payment_status: 'completed', tracking_number: 'LOCAL-TRACK', carrier: 'local-carrier' })
  expect(committedWrites).toEqual([{ status: 'shipped', tracking_number: 'LOCAL-TRACK', carrier: 'local-carrier', updated_at: expect.any(String) }])
  expect(tryProcessOrderNotifications).toHaveBeenCalledTimes(1)
  expect(retractGoogleConversion).not.toHaveBeenCalled()
  expect(noteMetaCancelUnverified).not.toHaveBeenCalled()
})

test('unpaid orders still accept ordinary admin edits and existing non-completion payment transitions', async () => {
  storedOrder = fixture({ status: 'pending', payment_status: 'pending' })
  expect((await PUT(request({ payment_status: 'failed', carrier: 'local-carrier' }), params)).status).toBe(200)
  expect(storedOrder).toMatchObject({ payment_status: 'failed', carrier: 'local-carrier' })
  expect(tryProcessOrderNotifications).toHaveBeenCalledTimes(1)
  expect(retractGoogleConversion).not.toHaveBeenCalled()
})

test.each([{ status: 'cancelled' }, { payment_status: 'refunded' }])('existing paid cancellation/refund effects remain: %j', async (body) => {
  expect((await PUT(request(body), params)).status).toBe(200)
  expect(retractGoogleConversion).toHaveBeenCalledWith('LOCAL-ORDER')
  expect(noteMetaCancelUnverified).toHaveBeenCalledWith('LOCAL-ORDER')
})

test('an already refunded order is unchanged on an identical retry', async () => {
  storedOrder = fixture({ payment_status: 'refunded' })
  expect((await PUT(request({ payment_status: 'refunded' }), params)).status).toBe(200)
  expectNoWriteOrEffects()
})

test('missing order returns 404 without attempting a write', async () => {
  storedOrder = null
  expect((await PUT(request({ payment_status: 'completed' }), params)).status).toBe(404)
  expectNoWriteOrEffects()
})

test('a failed snapshot lookup cannot authorize a payment or order write', async () => {
  lookupError = true
  expect((await PUT(request({ status: 'shipped' }), params)).status).toBe(500)
  expectNoWriteOrEffects()
})

test('write failure does not run order notifications or conversion effects', async () => {
  writeError = true
  expect((await PUT(request({ status: 'shipped' }), params)).status).toBe(500)
  expect(committedWrites).toEqual([])
  expect(tryProcessOrderNotifications).not.toHaveBeenCalled()
  expect(retractGoogleConversion).not.toHaveBeenCalled()
})

test('a concurrent provider completion is not overwritten by a stale admin payment edit', async () => {
  storedOrder = fixture({ status: 'pending', payment_status: 'pending' })
  beforeWrite = () => { storedOrder = fixture({ status: 'paid', payment_status: 'completed' }) }
  expect((await PUT(request({ payment_status: 'failed' }), params)).status).toBe(409)
  expect(storedOrder).toMatchObject({ status: 'paid', payment_status: 'completed' })
  expect(committedWrites).toEqual([])
  expect(tryProcessOrderNotifications).not.toHaveBeenCalled()
  expect(retractGoogleConversion).not.toHaveBeenCalled()
})

test.each([{ payment_status: 'refunded' }, { status: 'cancelled' }])('shipping edit conflicts with a concurrent financial/order change: %j', async (concurrent) => {
  beforeWrite = () => { storedOrder = fixture(concurrent) }
  expect((await PUT(request({ payment_status: 'completed', status: 'shipped' }), params)).status).toBe(409)
  expect(storedOrder).toMatchObject(concurrent)
  expect(committedWrites).toEqual([])
  expect(tryProcessOrderNotifications).not.toHaveBeenCalled()
})
