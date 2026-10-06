import { resolveVerifiedOrderPayment } from '@/lib/payment-verification'
import { complete3DSPaymentV2, retrievePayment, retrievePaymentByPaymentId } from '@/lib/iyzico'
import { isUnrefundedVerifiedPayment } from '@/lib/payment-reporting'
jest.mock('@/lib/iyzico', () => ({ complete3DSPaymentV2: jest.fn(), retrievePayment: jest.fn(), retrievePaymentByPaymentId: jest.fn() }))
jest.mock('@/lib/payment-reporting', () => ({ isUnrefundedVerifiedPayment: jest.fn() }))
const order = { payment_token: 'token', iyzico_basket_id: 'basket', total: 60000, shipping_cost: 0, items: [] }
const paid = { status: 'success', paymentStatus: 'SUCCESS', paymentId: 'provider-id', paidPrice: '600', basketId: 'basket', currency: 'TRY' }
describe('authoritative resolver', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.mocked(isUnrefundedVerifiedPayment).mockResolvedValue(true)
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue({ status: 'failure' })
  })
  it('does not accept retrieve SUCCESS if reporting indicates refund or is unavailable', async () => {
    jest.mocked(retrievePayment).mockResolvedValue(paid)
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue(paid)
    jest.mocked(isUnrefundedVerifiedPayment).mockResolvedValue(false)
    expect((await resolveVerifiedOrderPayment(order)).status).toBe('unknown')
  })
  it('requires paymentId, amount, basket, and currency even for provider success', async () => {
    for (const override of [{ paymentId: undefined }, { paidPrice: '1' }, { basketId: 'foreign' }, { currency: 'USD' }]) {
      jest.mocked(retrievePayment).mockResolvedValue({ ...paid, ...override })
      expect((await resolveVerifiedOrderPayment(order)).status).toBe('unknown')
    }
  })
  it('completes server-retrieved matching CALLBACK_THREEDS and retrieves final result', async () => {
    const pending = { ...paid, paymentStatus: 'CALLBACK_THREEDS' }
    jest.mocked(retrievePayment).mockResolvedValue(pending)
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValueOnce(pending).mockResolvedValueOnce(paid)
    jest.mocked(complete3DSPaymentV2).mockResolvedValue({ status: 'success' })
    expect((await resolveVerifiedOrderPayment(order, { paymentId: 'browser-forged-id' })).status).toBe('verified')
    expect(complete3DSPaymentV2).toHaveBeenCalledWith({ conversationId: 'token', paymentId: 'provider-id', basketId: 'basket', paidPrice: '600.00' })
  })
  it('never attempts auth for an unbound browser paymentId', async () => {
    jest.mocked(retrievePayment).mockResolvedValue({ status: 'failure' })
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS', basketId: 'foreign' })
    expect((await resolveVerifiedOrderPayment(order, { paymentId: 'browser-forged-id' })).status).toBe('unknown')
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
  })
  it('requires matched final FAILURE to permit cancellation', async () => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'FAILURE' })
    expect((await resolveVerifiedOrderPayment(order)).status).toBe('failed')
    jest.mocked(retrievePayment).mockResolvedValue({ status: 'failure', paymentStatus: 'FAILURE' })
    expect((await resolveVerifiedOrderPayment(order)).status).toBe('unknown')
  })
})
