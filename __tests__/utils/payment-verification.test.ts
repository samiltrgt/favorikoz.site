import { resolveVerifiedOrderPayment } from '@/lib/payment-verification'
import { complete3DSPayment, complete3DSPaymentV2, retrievePayment, retrievePaymentByPaymentId } from '@/lib/iyzico'
import { isUnrefundedVerifiedPayment } from '@/lib/payment-reporting'
jest.mock('@/lib/iyzico', () => ({ complete3DSPayment: jest.fn(), complete3DSPaymentV2: jest.fn(), retrievePayment: jest.fn(), retrievePaymentByPaymentId: jest.fn() }))
jest.mock('@/lib/payment-reporting', () => ({ isUnrefundedVerifiedPayment: jest.fn() }))
const order = { payment_token: 'token', iyzico_basket_id: 'basket', total: 60000, shipping_cost: 0, items: [] }
// Synthetic contract fixture only: real provider availability of this original
// transaction token has NOT been established by these mock tests.
const paid = { status: 'success', paymentStatus: 'SUCCESS', paymentId: '123', paymentConversationId: 'token', paidPrice: '600', basketId: 'basket', currency: 'TRY' }
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
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValueOnce(paid)
    jest.mocked(complete3DSPaymentV2).mockResolvedValue({ status: 'success' })
    expect((await resolveVerifiedOrderPayment(order, { paymentId: 'browser-forged-id', allowCompletion: true })).status).toBe('verified')
    expect(complete3DSPaymentV2).toHaveBeenCalledWith({ conversationId: 'token', paymentId: '123', basketId: 'basket', paidPrice: '600.00' })
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

  it.each([
    { paymentId: undefined }, { paymentId: 'not-a-numeric-id' }, { basketId: 'foreign' },
    { paidPrice: '1' }, { currency: 'USD' }, { currency: undefined },
    { paymentConversationId: undefined }, { paymentConversationId: 'foreign-token' },
    { paymentConversationId: '' }, { paidPrice: undefined }, { basketId: undefined },
  ])('requires every pre-completion binding, including the original token: %j', async (override) => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS', ...override })
    expect((await resolveVerifiedOrderPayment(order, { allowCompletion: true, paymentId: '123', conversationData: 'untrusted-data' })).status).toBe('unknown')
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
    expect(retrievePaymentByPaymentId).not.toHaveBeenCalled()
    expect(isUnrefundedVerifiedPayment).not.toHaveBeenCalled()
  })

  it.each(['SUCCESS', 'FAILURE', 'CALLBACK_THREEDS'])('does not use an echoed request conversationId as original-token proof for %s', async (paymentStatus) => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus, paymentConversationId: undefined, conversationId: 'token' } as any)
    expect((await resolveVerifiedOrderPayment(order, { allowCompletion: true })).status).toBe('unknown')
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
    expect(isUnrefundedVerifiedPayment).not.toHaveBeenCalled()
  })

  it('does not query an unbound browser ID when canonical-token retrieval is unavailable', async () => {
    jest.mocked(retrievePayment).mockRejectedValue(new Error('synthetic-timeout'))
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue(paid)
    expect((await resolveVerifiedOrderPayment(order, { paymentId: '999', allowCompletion: true })).status).toBe('unknown')
    expect(retrievePaymentByPaymentId).not.toHaveBeenCalled()
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
  })

  it.each([undefined, '', 'different-token'])('never substitutes input token for database token %j', async (payment_token) => {
    expect((await resolveVerifiedOrderPayment({ ...order, payment_token }, { conversationId: 'token', allowCompletion: true })).status).toBe('unknown')
    expect(retrievePayment).not.toHaveBeenCalled()
  })

  it('rejects a supplied token conflicting with the stored token before any provider call', async () => {
    expect((await resolveVerifiedOrderPayment(order, { conversationId: 'foreign-token', allowCompletion: true })).status).toBe('unknown')
    expect(retrievePayment).not.toHaveBeenCalled()
  })

  it('rejects a payment ID different from the previously bound database ID', async () => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS' })
    expect((await resolveVerifiedOrderPayment({ ...order, iyzico_payment_id: '999' }, { allowCompletion: true })).status).toBe('unknown')
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
    expect(retrievePaymentByPaymentId).not.toHaveBeenCalled()
  })

  it('can read by an already-bound database ID but still requires full original-token proof', async () => {
    jest.mocked(retrievePayment).mockResolvedValue({ status: 'failure' })
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue(paid)
    expect((await resolveVerifiedOrderPayment({ ...order, iyzico_payment_id: '123' }, { paymentId: '999' })).status).toBe('verified')
    expect(retrievePaymentByPaymentId).toHaveBeenCalledWith('123')
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
  })

  it.each([undefined, false])('does not initiate completion without explicit permission %j', async (allowCompletion) => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS' })
    expect((await resolveVerifiedOrderPayment(order, { allowCompletion, conversationData: 'untrusted-data' })).status).toBe('unknown')
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
  })

  it.each(['INIT_THREEDS', 'WAITING', 'unknown'])('never completes an unrecognized/not-ready provider state %s', async (paymentStatus) => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus })
    expect((await resolveVerifiedOrderPayment(order, { allowCompletion: true })).status).toBe('unknown')
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
  })

  it.each(['shipped', 'completed'])('does not authorize another payment for a %s order', async (status) => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS' })
    expect((await resolveVerifiedOrderPayment({ ...order, status }, { allowCompletion: true })).status).toBe('unknown')
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
  })

  it.each(['V1', 'V2'])('%s uses the canonical identity and retrieves/reports after completion', async (variant) => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS' })
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue(paid)
    const completion = variant === 'V1' ? complete3DSPayment : complete3DSPaymentV2
    jest.mocked(completion).mockResolvedValue({ status: 'success', paymentId: '999999' })
    expect((await resolveVerifiedOrderPayment(order, { paymentId: '999999', allowCompletion: true,
      conversationData: variant === 'V1' ? 'untrusted-data' : undefined,
    })).status).toBe('verified')
    expect(completion).toHaveBeenCalledTimes(1)
    expect(completion).toHaveBeenCalledWith(expect.objectContaining({ conversationId: 'token', paymentId: '123' }))
    expect(retrievePaymentByPaymentId).toHaveBeenCalledWith('123')
    const read = jest.mocked(retrievePayment).mock.invocationCallOrder[0]
    const auth = jest.mocked(completion).mock.invocationCallOrder[0]
    const finalRead = jest.mocked(retrievePaymentByPaymentId).mock.invocationCallOrder[0]
    const report = jest.mocked(isUnrefundedVerifiedPayment).mock.invocationCallOrder[0]
    expect(read).toBeLessThan(auth)
    expect(auth).toBeLessThan(finalRead)
    expect(finalRead).toBeLessThan(report)
    expect(variant === 'V1' ? complete3DSPaymentV2 : complete3DSPayment).not.toHaveBeenCalled()
  })

  it.each([{ paymentId: '999' }, { paymentConversationId: undefined }, { paymentConversationId: 'foreign' }, { basketId: 'foreign' }, { paidPrice: '1' }, { currency: 'USD' }])('rejects a mismatched final retrieval %j', async (override) => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS' })
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue({ ...paid, ...override })
    expect((await resolveVerifiedOrderPayment(order, { allowCompletion: true })).status).toBe('unknown')
    expect(complete3DSPaymentV2).toHaveBeenCalledTimes(1)
    expect(isUnrefundedVerifiedPayment).not.toHaveBeenCalled()
  })

  it('retrieves once after ambiguous completion without falling back to a second completion variant', async () => {
    jest.mocked(retrievePayment).mockResolvedValue({ ...paid, paymentStatus: 'CALLBACK_THREEDS' })
    jest.mocked(complete3DSPayment).mockRejectedValue(new Error('synthetic-timeout'))
    jest.mocked(retrievePaymentByPaymentId).mockResolvedValue(paid)
    expect((await resolveVerifiedOrderPayment(order, { allowCompletion: true, conversationData: 'untrusted-data' })).status).toBe('verified')
    expect(complete3DSPayment).toHaveBeenCalledTimes(1)
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
    expect(retrievePaymentByPaymentId).toHaveBeenCalledTimes(1)
  })
})
