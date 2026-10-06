import { GET } from '@/app/api/payment/status/route'
import { retrievePayment } from '@/lib/iyzico'
import { confirmOrderPayment } from '@/lib/tracking/payment'
import { sendPurchaseOnce } from '@/lib/analytics/meta-capi'

jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, options?: { status?: number }) => ({ status: options?.status ?? 200, json: async () => body }) },
}))
const mockDb = { from: jest.fn() }
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: () => mockDb, createSupabaseServer: jest.fn() }))
jest.mock('@/lib/payment-reporting', () => ({ isUnrefundedVerifiedPayment: jest.fn(async () => true) }))
jest.mock('@/lib/iyzico', () => ({ retrievePayment: jest.fn(), retrievePaymentByPaymentId: jest.fn(), complete3DSPaymentV2: jest.fn() }))
jest.mock('@/lib/tracking/payment', () => ({ confirmOrderPayment: jest.fn() }))
jest.mock('@/lib/analytics/meta-capi', () => ({ sendPurchaseOnce: jest.fn() }))
jest.mock('@/lib/order-email', () => ({ trySendOrderConfirmationEmail: jest.fn() }))
jest.mock('@/lib/nes', () => ({ isNesConfigured: () => false, createEArchiveInvoice: jest.fn() }))

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1', order_number: 'ORD-1', payment_token: 'valid-token',
    payment_status: 'pending', status: 'pending', iyzico_basket_id: 'basket-1',
    items: [{ product_id: 'p1', name: 'Product', price: 50000, quantity: 1 }],
    total: 60000, shipping_cost: 10000, discount_amount: 0,
    customer_email: 'buyer@example.com', customer_phone: '+905551234567',
    tracking: { consent: { analytics: true, marketing: true } }, ...overrides,
  }
}

function query(data: unknown) {
  const chain: any = {}
  for (const method of ['select', 'eq', 'limit', 'update', 'upsert']) chain[method] = jest.fn(() => chain)
  chain.maybeSingle = jest.fn().mockResolvedValue({ data, error: null })
  chain.single = chain.maybeSingle
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve)
  return chain
}
function request(search = 'token=valid-token&orderNumber=ORD-1') {
  return { url: `https://favorikoz.site/api/payment/status?${search}` } as any
}

describe('verified payment completion and purchase identity', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockDb.from.mockImplementation(() => query(order()))
    jest.mocked(retrievePayment).mockResolvedValue({ status: 'success', paymentStatus: 'SUCCESS', basketId: 'basket-1', paidPrice: '600.00', currency: 'TRY', paymentId: 'payment-1' })
    jest.mocked(confirmOrderPayment).mockResolvedValue(order({ payment_status: 'completed', status: 'paid' }) as any)
  })
  afterEach(() => jest.restoreAllMocks())

  it('rejects the former fake-payment token without updating orders', async () => {
    const response = await GET(request('token=test-token-any&orderNumber=ORD-1'))
    expect(response.status).toBe(400)
    expect(mockDb.from).not.toHaveBeenCalled()
    expect(confirmOrderPayment).not.toHaveBeenCalled()
  })

  it('requires an opaque payment token even when paymentId is present', async () => {
    const response = await GET(request('paymentId=123&orderNumber=ORD-1'))
    expect(response.status).toBe(400)
    expect(retrievePayment).not.toHaveBeenCalled()
  })

  it('looks up token and order number together to reject an unrelated order', async () => {
    const chain = query(null)
    mockDb.from.mockReturnValue(chain)
    const response = await GET(request('token=valid-token&orderNumber=OTHER-ORDER'))
    expect(response.status).toBe(404)
    expect(chain.eq).toHaveBeenCalledWith('payment_token', 'valid-token')
    expect(chain.eq).toHaveBeenCalledWith('order_number', 'OTHER-ORDER')
    expect(confirmOrderPayment).not.toHaveBeenCalled()
  })

  it('rejects cancelled and refunded orders before contacting iyzico', async () => {
    for (const overrides of [{ status: 'cancelled' }, { payment_status: 'refunded' }]) {
      mockDb.from.mockReturnValue(query(order(overrides)))
      const response = await GET(request())
      expect(response.status).toBe(409)
    }
    expect(retrievePayment).not.toHaveBeenCalled()
    expect(confirmOrderPayment).not.toHaveBeenCalled()
  })

  it('does not accept a successful payment for a different basket or amount', async () => {
    for (const mismatch of [{ basketId: 'another-basket', paidPrice: '600' }, { basketId: 'basket-1', paidPrice: '1' }]) {
      jest.mocked(retrievePayment).mockResolvedValue({ status: 'success', paymentStatus: 'SUCCESS', currency: 'TRY', ...mismatch })
      expect((await (await GET(request())).json()).status).toBe('pending')
    }
    expect(confirmOrderPayment).not.toHaveBeenCalled()
    expect(sendPurchaseOnce).not.toHaveBeenCalled()
  })

  it('keeps an order pending when iyzico retrieval fails or 3DS has not completed', async () => {
    const chain = query(order())
    mockDb.from.mockReturnValue(chain)
    for (const result of [{ status: 'failure', errorMessage: 'Timeout' }, { status: 'success', paymentStatus: 'INIT_THREEDS' }]) {
      jest.mocked(retrievePayment).mockResolvedValue(result)
      const response = await GET(request())
      expect((await response.json()).status).toBe('pending')
    }
    expect(chain.update).not.toHaveBeenCalled()
    expect(confirmOrderPayment).not.toHaveBeenCalled()
  })

  it('does not cancel on a thrown provider connection error', async () => {
    const chain = query(order())
    mockDb.from.mockReturnValue(chain)
    jest.mocked(retrievePayment).mockRejectedValueOnce(new Error('network reset'))
    expect((await (await GET(request())).json()).status).toBe('pending')
    expect(chain.update).not.toHaveBeenCalled()
  })

  it('does not cancel a FAILURE belonging to a different basket', async () => {
    const chain = query(order())
    mockDb.from.mockReturnValue(chain)
    jest.mocked(retrievePayment).mockResolvedValueOnce({ status: 'success', paymentStatus: 'FAILURE', basketId: 'foreign-basket', paidPrice: '600', currency: 'TRY' })
    expect((await (await GET(request())).json()).status).toBe('pending')
    expect(chain.update).not.toHaveBeenCalled()
  })

  it('reports a concurrent verified completion instead of stale provider FAILURE', async () => {
    const initial = query(order())
    const completed = query(order({ payment_status: 'completed', status: 'paid' }))
    mockDb.from.mockReturnValueOnce(initial).mockReturnValue(completed)
    jest.mocked(retrievePayment).mockResolvedValueOnce({ status: 'success', paymentStatus: 'FAILURE', basketId: 'basket-1', paidPrice: '600', currency: 'TRY', paymentId: 'payment-1' })
    expect((await (await GET(request())).json()).status).toBe('success')
    expect(completed.update).toHaveBeenCalledWith({ payment_status: 'failed', status: 'cancelled' })
    expect(completed.eq).toHaveBeenCalledWith('payment_status', 'pending')
    expect(confirmOrderPayment).not.toHaveBeenCalled()
  })

  it('confirms via the atomic payment RPC, then returns stable browser dedup identity', async () => {
    mockDb.from.mockImplementationOnce(() => query(order())).mockImplementation(() => query(order({ payment_status: 'completed', status: 'paid' })))
    const response = await GET(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(confirmOrderPayment).toHaveBeenCalledWith(mockDb, { paymentToken: 'valid-token', orderNumber: 'ORD-1' })
    expect(sendPurchaseOnce).toHaveBeenCalledWith('ORD-1')
    expect(body.analytics.event_id).toBe('ORD-1')
    expect(body.analytics.value).toBe(600)
    expect(body.analytics.consent.ad_storage).toBe('granted')
  })

  it('keeps a shipped paid order unchanged and omits advertising PII without consent', async () => {
    mockDb.from.mockReturnValue(query(order({ status: 'shipped', payment_status: 'completed', tracking: { consent: { analytics: true, marketing: false } } })))
    const response = await GET(request())
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.analytics.email).toBeUndefined()
    expect(body.analytics.phone).toBeUndefined()
    expect(body.analytics.consent.analytics_storage).toBe('granted')
    expect(body.analytics.consent.ad_storage).toBe('denied')
    expect(confirmOrderPayment).not.toHaveBeenCalled()
    expect(retrievePayment).not.toHaveBeenCalled()
  })
})
