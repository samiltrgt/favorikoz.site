jest.mock('@/lib/iyzico', () => ({ getIyzicoCredentials: jest.fn() }))
import { isUnrefundedPaymentReport, isUnrefundedVerifiedPayment } from '@/lib/payment-reporting'
import { getIyzicoCredentials } from '@/lib/iyzico'
import { createHmac } from 'crypto'
const order = { total: 10000, items: [], shipping_cost: 0, iyzico_basket_id: 'basket', payment_token: 'token' }
const result = { status: 'success', paymentId: '123', basketId: 'basket', paidPrice: '100.00', currency: 'TRY' }
const payment = { paymentId: '123', paymentConversationId: 'token', basketId: 'basket', currency: 'TRY', paidPrice: '100.00', paymentStatus: 1, fraudStatus: 1, paymentRefundStatus: 'NOT_REFUNDED', cancels: [], itemTransactions: [{ transactionStatus: 2, refunds: [] }] }
test('accepts only matching financially approved unrefunded report', () => {
  expect(isUnrefundedPaymentReport(order, result, { status: 'success', payments: [payment] })).toBe(true)
  expect(isUnrefundedPaymentReport(order, result, { status: 'success', payments: [{ ...payment, basketId: 'provider-internal-basket' }] })).toBe(true)
  expect(isUnrefundedPaymentReport(order, { ...result, basketId: 'wrong' }, { status: 'success', payments: [payment] })).toBe(false)
  for (const override of [{ fraudStatus: 0 }, { paymentRefundStatus: 'REFUNDED' }, { cancels: [{}] }, { paidPrice: '1.00' }, { paymentId: '999' }, { paymentConversationId: 'other' }, { itemTransactions: [{ transactionStatus: 2, refunds: [{}] }] }]) {
    expect(isUnrefundedPaymentReport(order, result, { status: 'success', payments: [{ ...payment, ...override }] })).toBe(false)
  }
  expect(isUnrefundedPaymentReport(order, result, { status: 'success', payments: [payment, payment] })).toBe(false)
  expect(isUnrefundedPaymentReport(order, result, { status: 'failure' })).toBe(false)
})
test('reporting GET signature hashes random plus path without a serialized POST body', async () => {
  ;(getIyzicoCredentials as jest.Mock).mockReturnValue({ apiKey: 'api', secretKey: 'secret', baseUrl: 'https://provider.invalid' })
  const savedFetch = global.fetch
  const savedTimeout = AbortSignal.timeout
  AbortSignal.timeout = jest.fn(() => new AbortController().signal)
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ status: 'success', payments: [payment] }) })) as any
  try {
    expect(await isUnrefundedVerifiedPayment(order, result)).toBe(true)
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://provider.invalid/v2/reporting/payment/details?locale=tr&paymentId=123')
    const random = options.headers['x-iyzi-rnd']
    const decoded = Buffer.from(options.headers.Authorization.slice('IYZWSv2 '.length), 'base64').toString('utf8')
    const expected = createHmac('sha256', 'secret').update(random + '/v2/reporting/payment/details').digest('hex')
    expect(decoded).toBe(`apiKey:api&randomKey:${random}&signature:${expected}`)
    expect(options.body).toBeUndefined()
  } finally { global.fetch = savedFetch; AbortSignal.timeout = savedTimeout }
})
