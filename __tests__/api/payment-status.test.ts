import { GET } from '@/app/api/payment/status/route'
import { complete3DSPayment, complete3DSPaymentV2, retrievePayment } from '@/lib/iyzico'
import { reconcileVerifiedPayment } from '@/lib/payment-reconciliation'
import { sendPurchaseOnce } from '@/lib/analytics/meta-capi'
import { trySendOrderConfirmationEmail } from '@/lib/order-email'

jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, options?: { status?: number }) => ({ status: options?.status ?? 200, json: async () => body }) },
}))
const mockDb = { from: jest.fn(), rpc: jest.fn() }
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: () => mockDb, createSupabaseServer: jest.fn() }))
jest.mock('@/lib/payment-reporting', () => ({ isUnrefundedVerifiedPayment: jest.fn(async () => true) }))
jest.mock('@/lib/iyzico', () => ({ retrievePayment: jest.fn(), retrievePaymentByPaymentId: jest.fn(), complete3DSPayment: jest.fn(), complete3DSPaymentV2: jest.fn() }))
jest.mock('@/lib/payment-reconciliation', () => ({ reconcileVerifiedPayment: jest.fn() }))
jest.mock('@/lib/analytics/meta-capi', () => ({ sendPurchaseOnce: jest.fn() }))
jest.mock('@/lib/order-email', () => ({ trySendOrderConfirmationEmail: jest.fn() }))
jest.mock('@/lib/nes', () => ({ isNesConfigured: () => false, createEArchiveInvoice: jest.fn() }))

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1', order_number: 'ORD-1', payment_token: 'valid-token',
    payment_status: 'pending', status: 'pending', iyzico_basket_id: 'basket-1',
    items: [{ product_id: 'p1', name: 'Product', price: 50000, quantity: 1 }],
    total: 60000, shipping_cost: 10000, discount_amount: 0,
    iyzico_payment_id: '123', payment_verified_at: '2026-01-01T00:00:00.000Z',
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
    mockDb.rpc.mockReset().mockResolvedValue({ data: true, error: null })
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockDb.from.mockImplementation(() => query(order()))
    jest.mocked(retrievePayment).mockResolvedValue({ status: 'success', paymentStatus: 'SUCCESS', paymentConversationId: 'valid-token', basketId: 'basket-1', paidPrice: '600.00', currency: 'TRY', paymentId: '123' })
    jest.mocked(reconcileVerifiedPayment).mockResolvedValue(order({ payment_status: 'completed', status: 'paid' }) as any)
  })
  afterEach(() => jest.restoreAllMocks())

  it('rejects the former fake-payment token without updating orders', async () => {
    const response = await GET(request('token=test-token-any&orderNumber=ORD-1'))
    expect(response.status).toBe(400)
    expect(mockDb.from).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
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
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  })

  it('rejects cancelled and refunded orders before contacting iyzico', async () => {
    for (const overrides of [{ status: 'cancelled' }, { status: 'refunded' }, { payment_status: 'refunded' }]) {
      mockDb.from.mockReturnValue(query(order(overrides)))
      const response = await GET(request())
      expect(response.status).toBe(409)
    }
    expect(retrievePayment).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  })

  it('does not accept a successful payment for a different basket or amount', async () => {
    for (const mismatch of [{ basketId: 'another-basket', paidPrice: '600' }, { basketId: 'basket-1', paidPrice: '1' }]) {
      jest.mocked(retrievePayment).mockResolvedValue({ status: 'success', paymentStatus: 'SUCCESS', paymentConversationId: 'valid-token', paymentId: '123', currency: 'TRY', ...mismatch })
      expect((await (await GET(request())).json()).status).toBe('pending')
    }
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
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
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
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
    jest.mocked(retrievePayment).mockResolvedValueOnce({ status: 'success', paymentStatus: 'FAILURE', paymentConversationId: 'valid-token', paymentId: '123', basketId: 'foreign-basket', paidPrice: '600', currency: 'TRY' })
    expect((await (await GET(request())).json()).status).toBe('pending')
    expect(chain.update).not.toHaveBeenCalled()
  })

  it('reports a concurrent verified completion instead of stale provider FAILURE', async () => {
    const initial = query(order())
    const completed = query(order({ payment_status: 'completed', status: 'paid' }))
    mockDb.from.mockReturnValueOnce(initial).mockReturnValue(completed)
    jest.mocked(retrievePayment).mockResolvedValueOnce({ status: 'success', paymentStatus: 'FAILURE', paymentConversationId: 'valid-token', basketId: 'basket-1', paidPrice: '600', currency: 'TRY', paymentId: '123' })
    expect((await (await GET(request())).json()).status).toBe('success')
    expect(completed.update).toHaveBeenCalledWith({ payment_status: 'failed', status: 'cancelled' })
    expect(completed.eq).toHaveBeenCalledWith('payment_status', 'pending')
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  })

  it('confirms via the atomic payment RPC, then returns stable browser dedup identity', async () => {
    mockDb.from.mockImplementationOnce(() => query(order())).mockImplementation(() => query(order({ payment_status: 'completed', status: 'paid' })))
    const response = await GET(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(reconcileVerifiedPayment).toHaveBeenCalledWith(mockDb, order(), expect.objectContaining({ paymentId: '123', paymentStatus: 'SUCCESS' }))
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
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(retrievePayment).not.toHaveBeenCalled()
  })

  it.each(['paid', 'shipped', 'completed'])('returns legacy %s paid orders without new analytics or effects', async (status) => {
    const chain = query(order({ status, payment_status: 'completed', iyzico_payment_id: null, payment_verified_at: null }))
    mockDb.from.mockReturnValue(chain)
    for (let repeat = 0; repeat < 2; repeat++) {
      expect(await (await GET(request())).json()).toMatchObject({ success: true, status: 'success', analytics: null })
    }
    expect(chain.update).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(retrievePayment).not.toHaveBeenCalled()
    expect(sendPurchaseOnce).not.toHaveBeenCalled()
    expect(trySendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it.each([
    { iyzico_payment_id: null }, { payment_verified_at: null },
    { iyzico_payment_id: '' }, { payment_verified_at: 'invalid-date' },
  ])('requires both valid proof fields for existing completed analytics: %j', async (proof) => {
    mockDb.from.mockReturnValue(query(order({ payment_status: 'completed', status: 'paid', ...proof })))
    expect(await (await GET(request())).json()).toMatchObject({ status: 'success', analytics: null })
    expect(sendPurchaseOnce).not.toHaveBeenCalled()
    expect(trySendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it('keeps provider-confirmed FAILURE on the existing guarded failure path', async () => {
    const pending = query(order())
    const failed = query(order({ payment_status: 'failed', status: 'cancelled' }))
    mockDb.from.mockReturnValueOnce(pending).mockReturnValue(failed)
    jest.mocked(retrievePayment).mockResolvedValue({ status: 'success', paymentStatus: 'FAILURE', paymentConversationId: 'valid-token', paymentId: '123', basketId: 'basket-1', paidPrice: '600.00', currency: 'TRY' })
    expect((await (await GET(request())).json()).status).toBe('failed')
    expect(failed.update).toHaveBeenCalledWith({ payment_status: 'failed', status: 'cancelled' })
    expect(failed.eq).toHaveBeenCalledWith('payment_status', 'pending')
    expect(failed.eq).toHaveBeenCalledWith('status', 'pending')
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  })

  it('preserves completed legacy state without analytics when FAILURE races with completion', async () => {
    mockDb.from.mockReturnValueOnce(query(order())).mockReturnValue(query(order({ payment_status: 'completed', status: 'paid', iyzico_payment_id: null, payment_verified_at: null })))
    jest.mocked(retrievePayment).mockResolvedValue({ status: 'success', paymentStatus: 'FAILURE', paymentConversationId: 'valid-token', paymentId: '123', basketId: 'basket-1', paidPrice: '600.00', currency: 'TRY' })
    expect(await (await GET(request())).json()).toMatchObject({ status: 'success', analytics: null })
    expect(sendPurchaseOnce).not.toHaveBeenCalled()
    expect(trySendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it('returns pending without effects when reconciliation fails', async () => {
    jest.mocked(reconcileVerifiedPayment).mockRejectedValueOnce(new Error('payment_reconciliation_failed'))
    const response = await GET(request())
    expect((await response.json()).status).toBe('pending')
    expect(sendPurchaseOnce).not.toHaveBeenCalled()
    expect(trySendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it.each([{ iyzico_payment_id: null }, { payment_verified_at: null }])('does not process incomplete reconciliation proof: %j', async (proof) => {
    jest.mocked(reconcileVerifiedPayment).mockResolvedValueOnce(order({ status: 'paid', payment_status: 'completed', ...proof }))
    expect((await (await GET(request())).json()).status).toBe('pending')
    expect(sendPurchaseOnce).not.toHaveBeenCalled()
    expect(trySendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it.each([{ status: 'cancelled' }, { status: 'refunded' }, { payment_status: 'refunded' }])('does not process an inactive canonical result: %j', async (inactive) => {
    jest.mocked(reconcileVerifiedPayment).mockResolvedValueOnce(order({ status: 'paid', payment_status: 'completed', ...inactive }))
    expect((await GET(request())).status).toBe(409)
    expect(sendPurchaseOnce).not.toHaveBeenCalled()
    expect(trySendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it.each(['shipped', 'completed'])('does not regress canonical %s fulfilment after verification', async (status) => {
    const saved = order({ status, payment_status: 'completed' })
    jest.mocked(reconcileVerifiedPayment).mockImplementationOnce(async () => {
      mockDb.from.mockReturnValue(query(saved))
      return saved
    })
    expect(await (await GET(request())).json()).toMatchObject({ status: 'success', analytics: { event_id: 'ORD-1' } })
    expect(trySendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it('reconciles a retry once and preserves browser order identity on subsequent polling', async () => {
    const saved = order({ status: 'paid', payment_status: 'completed' })
    jest.mocked(reconcileVerifiedPayment).mockImplementationOnce(async () => {
      mockDb.from.mockReturnValue(query(saved))
      return saved
    })
    const first = await (await GET(request())).json()
    const repeated = await (await GET(request())).json()
    expect(first.analytics.event_id).toBe('ORD-1')
    expect(repeated.analytics.event_id).toBe(first.analytics.event_id)
    expect(reconcileVerifiedPayment).toHaveBeenCalledTimes(1)
    expect(retrievePayment).toHaveBeenCalledTimes(1)
  })

  it.each([
    { label: 'false / ineligible ledger', reply: { data: false, error: null } },
    { label: 'missing ledger', reply: { data: null, error: null } },
    { label: 'undefined', reply: { data: undefined, error: null } },
    { label: 'string true', reply: { data: 'true', error: null } },
    { label: 'number', reply: { data: 1, error: null } },
    { label: 'array', reply: { data: [true], error: null } },
    { label: 'object', reply: { data: { purchase_eligible: true }, error: null } },
    { label: 'RPC error even with true', reply: { data: true, error: { message: 'synthetic-rpc-error' } } },
    { label: 'malformed envelope', reply: null },
  ])('fails closed for $label without replaying historical effects', async ({ reply }) => {
    mockDb.from.mockReturnValue(query(order({ status: 'paid', payment_status: 'completed' })))
    mockDb.rpc.mockResolvedValue(reply)
    expect(await (await GET(request())).json()).toMatchObject({ success: true, status: 'success', purchase_eligible: false, analytics: null })
    expect(mockDb.rpc).toHaveBeenCalledWith('is_verified_purchase', { p_order_id: 'order-1', p_event_id: 'ORD-1' })
    expect(sendPurchaseOnce).not.toHaveBeenCalled()
    expect(trySendOrderConfirmationEmail).not.toHaveBeenCalled()
    expect(retrievePayment).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  })

  it('fails closed on a thrown ledger check while retaining completed success UI', async () => {
    mockDb.from.mockReturnValue(query(order({ status: 'paid', payment_status: 'completed' })))
    mockDb.rpc.mockRejectedValue(new Error('synthetic-db-unavailable'))
    expect(await (await GET(request())).json()).toMatchObject({ status: 'success', purchase_eligible: false, analytics: null })
    expect(sendPurchaseOnce).not.toHaveBeenCalled()
  })

  describe.each(['existing completed', 'fresh reconciliation', 'concurrent completion'])('%s eligibility', (branch) => {
    function arrange() {
      const completed = query(order({ status: 'paid', payment_status: 'completed' }))
      if (branch === 'existing completed') mockDb.from.mockReturnValue(completed)
      else mockDb.from.mockReturnValueOnce(query(order())).mockReturnValue(completed)
      if (branch === 'concurrent completion') jest.mocked(retrievePayment).mockResolvedValueOnce({
        status: 'success', paymentStatus: 'FAILURE', paymentConversationId: 'valid-token', paymentId: '123', basketId: 'basket-1', paidPrice: '600.00', currency: 'TRY',
      })
    }
    it('requires the exact canonical order/event binding before returning eligible analytics', async () => {
      arrange()
      const body = await (await GET(request())).json()
      expect(body).toMatchObject({ status: 'success', purchase_eligible: true,
        analytics: { purchase_eligible: true, order_number: 'ORD-1', event_id: 'ORD-1', value: 600 } })
      expect(mockDb.rpc).toHaveBeenCalledTimes(1)
      expect(mockDb.rpc).toHaveBeenCalledWith('is_verified_purchase', { p_order_id: 'order-1', p_event_id: 'ORD-1' })
    })
    it.each([false, null, 'true'])('omits analytics for non-boolean-true proof %j', async (proof) => {
      arrange()
      mockDb.rpc.mockResolvedValue({ data: proof, error: null })
      expect(await (await GET(request())).json()).toMatchObject({ status: 'success', purchase_eligible: false, analytics: null })
    })
  })

  it('does not trust analytics lookup data returned with an error', async () => {
    const saved = order({ status: 'paid', payment_status: 'completed' })
    const broken = query(saved)
    broken.maybeSingle.mockResolvedValue({ data: saved, error: { message: 'synthetic-lookup-error' } })
    mockDb.from.mockReturnValueOnce(query(saved)).mockReturnValue(broken)
    expect(await (await GET(request())).json()).toMatchObject({ status: 'success', purchase_eligible: false, analytics: null })
    expect(mockDb.rpc).not.toHaveBeenCalled()
  })

  it('GET status never initiates completion even for fully bound CALLBACK_THREEDS', async () => {
    const pending = query(order())
    mockDb.from.mockReturnValue(pending)
    jest.mocked(complete3DSPaymentV2).mockClear()
    jest.mocked(complete3DSPayment).mockClear()
    jest.mocked(retrievePayment).mockResolvedValue({ status: 'success', paymentStatus: 'CALLBACK_THREEDS',
      paymentId: '123', paymentConversationId: 'valid-token', basketId: 'basket-1', paidPrice: '600.00', currency: 'TRY' })
    expect(await (await GET(request())).json()).toMatchObject({ status: 'pending' })
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(pending.update).not.toHaveBeenCalled()
    expect(sendPurchaseOnce).not.toHaveBeenCalled()
  })
})
