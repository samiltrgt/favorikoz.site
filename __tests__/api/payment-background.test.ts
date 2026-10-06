import { createHmac } from 'crypto'
import { POST } from '@/app/api/payment/webhook/route'
import { GET } from '@/app/api/cron/payments/route'
import { resolveVerifiedOrderPayment } from '@/lib/payment-verification'
import { reconcileVerifiedPayment } from '@/lib/payment-reconciliation'
import { processVerifiedPaymentOrder } from '@/lib/payment-postprocessing'
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, options?: { status?: number }) => ({ status: options?.status ?? 200, json: async () => body }) } }))
const mockDb = { from: jest.fn(), rpc: jest.fn() }
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: () => mockDb }))
jest.mock('@/lib/payment-verification', () => ({ resolveVerifiedOrderPayment: jest.fn() }))
jest.mock('@/lib/payment-reconciliation', () => ({ reconcileVerifiedPayment: jest.fn() }))
jest.mock('@/lib/payment-postprocessing', () => ({ processVerifiedPaymentOrder: jest.fn() }))
const order = { id: 'order', order_number: 'ORDER', payment_token: 'token', status: 'pending', payment_status: 'pending' }
const body = { iyziEventType: 'THREE_DS_AUTH', paymentId: 123, paymentConversationId: 'token', status: 'SUCCESS' }
function request(signed = true) {
  const signature = createHmac('sha256', 'secret').update('secret' + body.iyziEventType + body.paymentId + body.paymentConversationId + body.status).digest('hex')
  return { text: async () => JSON.stringify(body), headers: new Headers(signed ? { 'x-iyz-signature-v3': signature } : {}) } as any
}
beforeEach(() => {
  jest.clearAllMocks()
  process.env.IYZICO_SECRET_KEY = 'secret'; process.env.CRON_SECRET = 'cron'
  const chain: any = {}; chain.select = chain.eq = jest.fn(() => chain)
  chain.maybeSingle = jest.fn(async () => ({ data: order, error: null }))
  mockDb.from.mockReturnValue(chain)
  ;(resolveVerifiedOrderPayment as jest.Mock).mockResolvedValue({ status: 'verified', result: { paymentId: '123' } })
})
test('unsigned webhook cannot read orders or write financial records', async () => {
  expect((await POST(request(false))).status).toBe(401)
  expect(mockDb.from).not.toHaveBeenCalled()
  expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
})
test('signed numeric ID retrieves authoritative result before reconciliation', async () => {
  expect((await POST(request())).status).toBe(200)
  expect(resolveVerifiedOrderPayment).toHaveBeenCalledWith(order, { conversationId: 'token', paymentId: '123' })
  expect(reconcileVerifiedPayment).toHaveBeenCalledTimes(1)
  expect(processVerifiedPaymentOrder).toHaveBeenCalledTimes(1)
})
test('unknown provider result stays unresolved and allows webhook retry', async () => {
  ;(resolveVerifiedOrderPayment as jest.Mock).mockResolvedValue({ status: 'unknown' })
  expect((await POST(request())).status).toBe(503)
  expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
})
test('authoritative failed result never cancels from a background event', async () => {
  ;(resolveVerifiedOrderPayment as jest.Mock).mockResolvedValue({ status: 'failed' })
  expect((await POST(request())).status).toBe(200)
  expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
  expect(processVerifiedPaymentOrder).not.toHaveBeenCalled()
})
test('provider connection outage responds retryable without financial updates', async () => {
  ;(resolveVerifiedOrderPayment as jest.Mock).mockRejectedValue(new Error('timeout'))
  expect((await POST(request())).status).toBe(503)
  expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
})
test('another payment ID is refused even on a valid signed event', async () => {
  ;(resolveVerifiedOrderPayment as jest.Mock).mockResolvedValue({ status: 'verified', result: { paymentId: '999' } })
  expect((await POST(request())).status).toBe(409)
  expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
})
test('cron requires secret and claims bounded candidates', async () => {
  expect((await GET({ headers: new Headers() } as any)).status).toBe(401)
  expect(mockDb.rpc).not.toHaveBeenCalled()
  mockDb.rpc.mockResolvedValue({ data: [order], error: null })
  expect((await GET({ headers: new Headers({ authorization: 'Bearer cron' }) } as any)).status).toBe(200)
  expect(mockDb.rpc).toHaveBeenCalledWith('claim_payment_checks', { p_limit: 5 })
  expect(reconcileVerifiedPayment).toHaveBeenCalledTimes(1)
})
test('cron claim errors fail closed without processing', async () => {
  mockDb.rpc.mockResolvedValue({ data: null, error: { message: 'RPC unavailable' } })
  expect((await GET({ headers: new Headers({ authorization: 'Bearer cron' }) } as any)).status).toBe(503)
  expect(resolveVerifiedOrderPayment).not.toHaveBeenCalled()
})
