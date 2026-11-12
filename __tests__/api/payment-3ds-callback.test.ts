import { GET, POST } from '@/app/api/payment/3ds-callback/route'
import { complete3DSPayment, complete3DSPaymentV2, retrievePayment, retrievePaymentByPaymentId } from '@/lib/iyzico'
import { reconcileVerifiedPayment } from '@/lib/payment-reconciliation'
import { markOrderPaymentFailed } from '@/lib/iyzico-payment-amount'
import { processVerifiedPaymentOrder } from '@/lib/payment-postprocessing'
import { isUnrefundedVerifiedPayment } from '@/lib/payment-reporting'

jest.mock('next/server', () => ({ NextResponse: { redirect: (url: string) => ({ url }) } }))
const mockDb = { from: jest.fn() }
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: () => mockDb }))
jest.mock('@/lib/iyzico', () => ({ complete3DSPayment: jest.fn(), complete3DSPaymentV2: jest.fn(), retrievePayment: jest.fn(), retrievePaymentByPaymentId: jest.fn() }))
jest.mock('@/lib/payment-reporting', () => ({ isUnrefundedVerifiedPayment: jest.fn(async () => true) }))
jest.mock('@/lib/payment-postprocessing', () => ({ processVerifiedPaymentOrder: jest.fn() }))
jest.mock('@/lib/payment-reconciliation', () => ({ reconcileVerifiedPayment: jest.fn() }))
jest.mock('@/lib/iyzico-payment-amount', () => ({ ...jest.requireActual('@/lib/iyzico-payment-amount'), markOrderPaymentFailed: jest.fn() }))
const order = { id: 'order-1', order_number: 'ORD-1', payment_token: 'token-1', status: 'pending', payment_status: 'pending', iyzico_payment_id: null, payment_verified_at: null, iyzico_basket_id: 'basket-1', total: 60000, shipping_cost: 10000, items: [], discount_amount: 0 }
const paid = { status: 'success', paymentStatus: 'SUCCESS', paymentId: '123', paymentConversationId: 'token-1', basketId: 'basket-1', paidPrice: '600', currency: 'TRY' }
const saved = { ...order, status: 'paid', payment_status: 'completed', iyzico_payment_id: '123', payment_verified_at: '2026-01-01T00:00:00.000Z' }
function query(data: unknown, error: unknown = null) {
  const chain: any = {}
  chain.select = chain.eq = jest.fn(() => chain)
  chain.maybeSingle = jest.fn(async () => ({ data, error }))
  return chain
}
function request(mdStatus = '1', conversationData = 'opaque-data') {
  return { url: 'https://favorikoz.site/api/payment/3ds-callback', headers: new Headers({ host: 'favorikoz.site' }), formData: async () => new Map(Object.entries({ conversationId: 'token-1', paymentId: '123', conversationData, mdStatus })) } as any
}
describe('3DS callbacks require authoritative payment retrieval', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockDb.from.mockReturnValue(query(order))
    jest.mocked(reconcileVerifiedPayment).mockResolvedValue(saved)
    jest.mocked(isUnrefundedVerifiedPayment).mockResolvedValue(true)
    jest.mocked(retrievePayment).mockResolvedValue(paid)
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue({ status: 'failure' })
  })
  afterEach(() => jest.restoreAllMocks())
  it('confirms already successful retrieval without initiating completion', async () => {
    jest.mocked(complete3DSPayment).mockResolvedValue({ status: 'success', paymentId: '123' })
    const response = await POST(request()) as any
    expect(retrievePayment).toHaveBeenCalledWith('token-1')
    expect(reconcileVerifiedPayment).toHaveBeenCalledWith(mockDb, order, paid)
    const selected = mockDb.from.mock.results[0].value.select.mock.calls[0][0]
    expect(selected.split(',').map((column: string) => column.trim())).toEqual(expect.arrayContaining(['id', 'iyzico_payment_id', 'payment_verified_at']))
    expect(response.url).toContain('status=success')
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
  })
  it('keeps unavailable auth and retrieval pending', async () => {
    jest.mocked(complete3DSPayment).mockRejectedValueOnce(new Error('network'))
    jest.mocked(retrievePayment).mockResolvedValueOnce({ status: 'failure', errorMessage: 'timeout' })
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })
  it('retrieves after duplicate completion instead of cancelling', async () => {
    jest.mocked(complete3DSPayment).mockResolvedValue({ status: 'failure', errorCode: 'already_complete' })
    expect((await POST(request()) as any).url).toContain('status=success')
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })
  it('does not trust browser mdStatus failure to cancel a paid order', async () => {
    await POST(request('0'))
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).toHaveBeenCalledTimes(1)
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })
  it('does not confirm a foreign basket even after successful auth', async () => {
    jest.mocked(complete3DSPayment).mockResolvedValue({ status: 'success' })
    jest.mocked(retrievePayment).mockResolvedValueOnce({ ...paid, basketId: 'foreign' })
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })

  it.each(['paid', 'shipped', 'completed'])('redirects legacy completed %s orders without payment or effects', async (status) => {
    mockDb.from.mockReturnValue(query({ ...order, payment_status: 'completed', status }))
    for (let repeat = 0; repeat < 2; repeat++) {
      const response = await POST(request()) as any
      expect(response.url).toContain('/payment/callback?token=token-1&orderNumber=ORD-1')
    }
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(retrievePayment).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(processVerifiedPaymentOrder).not.toHaveBeenCalled()
  })

  it.each([{ status: 'cancelled' }, { status: 'refunded' }, { payment_status: 'refunded' }])('rejects inactive orders before auth: %j', async (inactive) => {
    mockDb.from.mockReturnValue(query({ ...order, ...inactive }))
    expect((await POST(request()) as any).url).toContain('order_not_payable')
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(retrievePayment).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  })

  it('treats a database lookup failure as pending', async () => {
    mockDb.from.mockReturnValue(query(null, { message: 'offline' }))
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  })

  it('does not reconcile when reporting cannot establish an unrefunded payment', async () => {
    jest.mocked(isUnrefundedVerifiedPayment).mockResolvedValue(false)
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })

  it('uses guarded failure handling only after a matched provider FAILURE', async () => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'FAILURE' })
    mockDb.from.mockReturnValueOnce(query(order)).mockReturnValue(query({ ...order, status: 'cancelled', payment_status: 'failed' }))
    expect((await POST(request()) as any).url).toContain('status=failed')
    expect(markOrderPaymentFailed).toHaveBeenCalledWith(mockDb, { paymentToken: 'token-1', orderNumber: 'ORD-1' })
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  })

  it('does not show a stale failure after concurrent completion', async () => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'FAILURE' })
    mockDb.from.mockReturnValueOnce(query(order)).mockReturnValue(query(saved))
    expect((await POST(request()) as any).url).toContain('status=success')
    expect(processVerifiedPaymentOrder).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  })

  it.each([{ status: 'cancelled' }, { status: 'refunded' }, { payment_status: 'refunded' }])('does not process an inactive reconciliation result: %j', async (inactive) => {
    jest.mocked(reconcileVerifiedPayment).mockResolvedValue({ ...saved, ...inactive })
    expect((await POST(request()) as any).url).toContain('order_not_payable')
    expect(processVerifiedPaymentOrder).not.toHaveBeenCalled()
  })

  it('keeps failed reconciliation pending without postprocessing', async () => {
    jest.mocked(reconcileVerifiedPayment).mockRejectedValueOnce(new Error('payment_reconciliation_failed'))
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(processVerifiedPaymentOrder).not.toHaveBeenCalled()
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })

  it.each(['V1', 'V2'])('%s route orders retrieval, completion, final retrieval, reporting and reconciliation', async (variant) => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS' })
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue(paid)
    const completion = variant === 'V1' ? complete3DSPayment : complete3DSPaymentV2
    jest.mocked(completion).mockResolvedValue({ status: 'success', paymentId: 'untrusted-auth-reply' })
    jest.mocked(reconcileVerifiedPayment).mockImplementationOnce(async () => {
      mockDb.from.mockReturnValue(query(saved))
      return saved
    })
    const response = await POST(request('1', variant === 'V1' ? 'opaque-data' : '')) as any
    expect(response.url).toContain('status=success')
    expect(completion).toHaveBeenCalledTimes(1)
    expect(completion).toHaveBeenCalledWith(expect.objectContaining({ conversationId: 'token-1', paymentId: '123' }))
    expect(retrievePaymentByPaymentId).toHaveBeenCalledWith('123')
    expect(reconcileVerifiedPayment).toHaveBeenCalledWith(mockDb, order, paid)
    const sequence = [retrievePayment, completion, retrievePaymentByPaymentId, isUnrefundedVerifiedPayment, reconcileVerifiedPayment]
      .map(fn => jest.mocked(fn).mock.invocationCallOrder[0])
    expect(sequence.every(Number.isFinite)).toBe(true)
    expect(sequence).toEqual([...sequence].sort((a, b) => a - b))
    expect(variant === 'V1' ? complete3DSPaymentV2 : complete3DSPayment).not.toHaveBeenCalled()
    await POST(request('1', variant === 'V1' ? 'opaque-data' : ''))
    expect(completion).toHaveBeenCalledTimes(1)
    expect(retrievePayment).toHaveBeenCalledTimes(1)
    expect(reconcileVerifiedPayment).toHaveBeenCalledTimes(1)
    expect(processVerifiedPaymentOrder).toHaveBeenCalledTimes(1)
  })

  it('does not reconcile or mark failed when post-completion reporting cannot confirm the payment', async () => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS' })
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue(paid)
    jest.mocked(isUnrefundedVerifiedPayment).mockResolvedValue(false)
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(complete3DSPayment).toHaveBeenCalledTimes(1)
    expect(isUnrefundedVerifiedPayment).toHaveBeenCalledWith(order, paid)
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
    expect(processVerifiedPaymentOrder).not.toHaveBeenCalled()
  })

  it('does not reconcile a different payment ID returned by the final retrieve', async () => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS' })
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue({ ...paid, paymentId: '999' })
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(retrievePaymentByPaymentId).toHaveBeenCalledWith('123')
    expect(isUnrefundedVerifiedPayment).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })

  it.each(['CALLBACK_THREEDS', 'SUCCESS', 'FAILURE'])('keeps missing original-token proof pending for %s without completion/reconciliation/failure writes', async (paymentStatus) => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus, paymentConversationId: undefined })
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
    expect(processVerifiedPaymentOrder).not.toHaveBeenCalled()
  })

  it('negative browser mdStatus cannot initiate completion of a matching pending 3DS transaction', async () => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS' })
    expect((await POST(request('0')) as any).url).toContain('status=pending')
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })

  it.each([{ iyzico_payment_id: null }, { payment_verified_at: null }, { payment_verified_at: 'invalid-date' }])('does not process incomplete reconciliation proof: %j', async (proof) => {
    jest.mocked(reconcileVerifiedPayment).mockResolvedValueOnce({ ...saved, ...proof })
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(processVerifiedPaymentOrder).not.toHaveBeenCalled()
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })

  it('does not reconcile or authorize again after a successful repeated POST', async () => {
    jest.mocked(reconcileVerifiedPayment).mockImplementationOnce(async () => {
      mockDb.from.mockReturnValue(query(saved))
      return saved
    })
    expect((await POST(request()) as any).url).toContain('status=success')
    expect((await POST(request()) as any).url).toContain('orderNumber=ORD-1')
    expect(reconcileVerifiedPayment).toHaveBeenCalledTimes(1)
    expect(retrievePayment).toHaveBeenCalledTimes(1)
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(processVerifiedPaymentOrder).toHaveBeenCalledTimes(1)
  })

  it('preserves the GET redirect contract without financial operations', async () => {
    const response = await GET({ url: 'https://favorikoz.site/api/payment/3ds-callback?conversationId=token-1&orderNumber=ORD-1&paymentId=123', headers: new Headers({ host: 'favorikoz.site' }) } as any) as any
    const url = new URL(response.url)
    expect(url.pathname).toBe('/payment/callback')
    expect(Object.fromEntries(url.searchParams)).toEqual({ token: 'token-1', orderNumber: 'ORD-1', paymentId: '123' })
    expect(mockDb.from).not.toHaveBeenCalled()
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  })
})
