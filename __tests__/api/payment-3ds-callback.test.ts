import { POST } from '@/app/api/payment/3ds-callback/route'
import { complete3DSPayment, retrievePayment, retrievePaymentByPaymentId } from '@/lib/iyzico'
import { confirmOrderPayment } from '@/lib/tracking/payment'
import { markOrderPaymentFailed } from '@/lib/iyzico-payment-amount'

jest.mock('next/server', () => ({ NextResponse: { redirect: (url: string) => ({ url }) } }))
const mockDb = { from: jest.fn() }
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: () => mockDb }))
jest.mock('@/lib/iyzico', () => ({ complete3DSPayment: jest.fn(), complete3DSPaymentV2: jest.fn(), retrievePayment: jest.fn(), retrievePaymentByPaymentId: jest.fn() }))
jest.mock('@/lib/payment-reporting', () => ({ isUnrefundedVerifiedPayment: jest.fn(async () => true) }))
jest.mock('@/lib/payment-postprocessing', () => ({ processVerifiedPaymentOrder: jest.fn() }))
jest.mock('@/lib/tracking/payment', () => ({ confirmOrderPayment: jest.fn() }))
jest.mock('@/lib/iyzico-payment-amount', () => ({ ...jest.requireActual('@/lib/iyzico-payment-amount'), markOrderPaymentFailed: jest.fn() }))
const order = { order_number: 'ORD-1', payment_token: 'token-1', status: 'pending', payment_status: 'pending', iyzico_basket_id: 'basket-1', total: 60000, shipping_cost: 10000, items: [], discount_amount: 0 }
const paid = { status: 'success', paymentStatus: 'SUCCESS', paymentId: '123', basketId: 'basket-1', paidPrice: '600', currency: 'TRY' }
function request(mdStatus = '1') {
  return { url: 'https://favorikoz.site/api/payment/3ds-callback', headers: new Headers({ host: 'favorikoz.site' }), formData: async () => new Map(Object.entries({ conversationId: 'token-1', paymentId: '123', conversationData: 'opaque-data', mdStatus })) } as any
}
describe('3DS callbacks require authoritative payment retrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockDb.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: order }) }) }) })
    jest.mocked(retrievePayment).mockResolvedValue(paid)
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue({ status: 'failure' })
  })
  afterEach(() => jest.restoreAllMocks())
  it('confirms omitted paymentStatus auth only after matched retrieval', async () => {
    jest.mocked(complete3DSPayment).mockResolvedValue({ status: 'success', paymentId: '123' })
    const response = await POST(request()) as any
    expect(retrievePayment).toHaveBeenCalledWith('token-1')
    expect(confirmOrderPayment).toHaveBeenCalledWith(mockDb, { paymentToken: 'token-1', orderNumber: 'ORD-1' })
    expect(response.url).toContain('status=success')
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })
  it('keeps unavailable auth and retrieval pending', async () => {
    jest.mocked(complete3DSPayment).mockRejectedValueOnce(new Error('network'))
    jest.mocked(retrievePayment).mockResolvedValueOnce({ status: 'failure', errorMessage: 'timeout' })
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(confirmOrderPayment).not.toHaveBeenCalled()
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
    expect(confirmOrderPayment).toHaveBeenCalledTimes(1)
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })
  it('does not confirm a foreign basket even after successful auth', async () => {
    jest.mocked(complete3DSPayment).mockResolvedValue({ status: 'success' })
    jest.mocked(retrievePayment).mockResolvedValueOnce({ ...paid, basketId: 'foreign' })
    expect((await POST(request()) as any).url).toContain('status=pending')
    expect(confirmOrderPayment).not.toHaveBeenCalled()
    expect(markOrderPaymentFailed).not.toHaveBeenCalled()
  })
})
