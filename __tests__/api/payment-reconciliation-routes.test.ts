import type { NextRequest } from 'next/server'
import { createHmac } from 'crypto'
import { POST as callback } from '@/app/api/payment/3ds-callback/route'
import { GET as status } from '@/app/api/payment/status/route'
import { POST as webhook } from '@/app/api/payment/webhook/route'
import { GET as cron } from '@/app/api/cron/payments/route'
import { complete3DSPayment, retrievePayment } from '@/lib/iyzico'
import { processVerifiedPaymentOrder } from '@/lib/payment-postprocessing'
import { sendPurchaseOnce } from '@/lib/analytics/meta-capi'

jest.mock('next/server', () => ({ NextResponse: {
  json: (body: unknown, options?: { status?: number }) => ({ status: options?.status ?? 200, json: async () => body }),
  redirect: (url: string) => ({ url }),
} }))
const db = { from: jest.fn(), rpc: jest.fn() }
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: () => db }))
jest.mock('@/lib/iyzico', () => ({ complete3DSPayment: jest.fn(), complete3DSPaymentV2: jest.fn(), retrievePayment: jest.fn(), retrievePaymentByPaymentId: jest.fn() }))
jest.mock('@/lib/payment-reporting', () => ({ isUnrefundedVerifiedPayment: jest.fn(async () => true) }))
jest.mock('@/lib/payment-postprocessing', () => ({ processVerifiedPaymentOrder: jest.fn() }))
jest.mock('@/lib/analytics/meta-capi', () => ({ sendPurchaseOnce: jest.fn() }))

const originalIyzicoSecret = process.env.IYZICO_SECRET_KEY
const originalCronSecret = process.env.CRON_SECRET
const provider = { status: 'success', paymentStatus: 'SUCCESS', paymentId: '1234567', paymentConversationId: 'synthetic-token', basketId: 'synthetic-basket', currency: 'TRY', paidPrice: '125.00' }
function fixture() {
  return {
    id: 'synthetic-order', order_number: 'SYNTHETIC-ORDER', payment_token: 'synthetic-token',
    status: 'pending', payment_status: 'pending', iyzico_basket_id: 'synthetic-basket',
    iyzico_payment_id: null as string | null, payment_verified_at: null as string | null,
    total: 12500, shipping_cost: 0, discount_amount: 0, items: [{ product_id: 'local-product', price: 12500, quantity: 1 }],
    tracking: { consent: { marketing: true, analytics: false } },
  }
}
let stored: ReturnType<typeof fixture>

// Only models query projections and RPC replies. It does not emulate SQL locking
// or claim to prove the database's single-Purchase transaction guarantee.
function query() {
  let columns = '*'
  const filters: Array<[string, unknown]> = []
  const chain = {
    select: (value = '*') => { columns = value; return chain },
    eq: (key: string, value: unknown) => { filters.push([key, value]); return chain },
    maybeSingle: async () => {
      const row = stored as unknown as Record<string, unknown>
      if (filters.some(([key, value]) => row[key] !== value)) return { data: null, error: null }
      return { data: columns === '*' ? { ...stored } : Object.fromEntries(columns.split(',').map(key => [key.trim(), row[key.trim()]])), error: null }
    },
  }
  return chain
}

const callbackRequest = () => ({
  url: 'https://shop.test/api/payment/3ds-callback', headers: new Headers({ host: 'shop.test' }),
  formData: async () => new Map(Object.entries({ conversationId: 'synthetic-token', paymentId: 'browser-hint', conversationData: 'synthetic-data', mdStatus: '1' })),
}) as unknown as NextRequest
const statusRequest = () => ({ url: 'https://shop.test/api/payment/status?token=synthetic-token&orderNumber=SYNTHETIC-ORDER' }) as NextRequest

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  process.env.IYZICO_SECRET_KEY = 'synthetic-webhook-secret'
  process.env.CRON_SECRET = 'synthetic-cron-secret'
  stored = fixture()
  db.from.mockImplementation(query)
  db.rpc.mockImplementation(async (name, args) => {
    if (name === 'is_verified_purchase') {
      expect(args).toEqual({ p_order_id: 'synthetic-order', p_event_id: 'SYNTHETIC-ORDER' })
      return { data: true, error: null }
    }
    if (name === 'claim_payment_checks') return { data: [], error: null }
    expect(name).toBe('reconcile_verified_payment')
    expect(args).toEqual({ p_order_id: 'synthetic-order', p_payment_id: '1234567', p_basket_id: 'synthetic-basket', p_total: 12500 })
    stored = { ...stored, status: 'paid', payment_status: 'completed', iyzico_payment_id: '1234567', payment_verified_at: '2026-01-01T00:00:00.000Z' }
    return { data: [{ ...stored }], error: null }
  })
  jest.mocked(complete3DSPayment).mockResolvedValue({ status: 'success', paymentId: 'untrusted-auth-hint' })
  jest.mocked(retrievePayment).mockResolvedValue(provider)
})
afterEach(() => {
  jest.restoreAllMocks()
  if (originalIyzicoSecret === undefined) delete process.env.IYZICO_SECRET_KEY
  else process.env.IYZICO_SECRET_KEY = originalIyzicoSecret
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = originalCronSecret
  expect(fetch).not.toHaveBeenCalled()
})

test('both routes use the real reconciliation helper and forward canonical SQL bindings', async () => {
  const redirect = await callback(callbackRequest()) as unknown as { url: string }
  expect(redirect.url).toContain('status=success')
  expect(db.rpc.mock.calls.filter(([name]) => name === 'reconcile_verified_payment')).toHaveLength(1)
  expect(processVerifiedPaymentOrder).toHaveBeenCalledWith(db, { paymentToken: 'synthetic-token', orderNumber: 'SYNTHETIC-ORDER' })
  const response = await status(statusRequest())
  expect(await response.json()).toMatchObject({ status: 'success', analytics: { event_id: 'SYNTHETIC-ORDER', value: 125 } })
  expect(db.rpc.mock.calls.filter(([name]) => name === 'reconcile_verified_payment')).toHaveLength(1)
})

test('callback retries, a signed webhook and cron retain the same reconciliation identity', async () => {
  await callback(callbackRequest())
  await callback(callbackRequest())
  const event = { iyziEventType: 'THREE_DS_AUTH', paymentId: 1234567, paymentConversationId: 'synthetic-token', status: 'SUCCESS' }
  const secret = 'synthetic-webhook-secret'
  const signature = createHmac('sha256', secret).update(secret + event.iyziEventType + event.paymentId + event.paymentConversationId + event.status).digest('hex')
  const notification = await webhook({ text: async () => JSON.stringify(event), headers: new Headers({ 'x-iyz-signature-v3': signature }) } as unknown as NextRequest)
  expect(notification.status).toBe(200)
  const worker = await cron({ headers: new Headers({ authorization: 'Bearer synthetic-cron-secret' }) } as NextRequest)
  expect(await worker.json()).toMatchObject({ checked: 0, reconciled: 0, errors: 0 })
  const reconciliations = db.rpc.mock.calls.filter(([name]) => name === 'reconcile_verified_payment')
  expect(reconciliations).toHaveLength(2)
  expect(reconciliations[0]).toEqual(reconciliations[1])
  expect(complete3DSPayment).not.toHaveBeenCalled()
  expect((await (await status(statusRequest())).json()).analytics.event_id).toBe('SYNTHETIC-ORDER')
})

test('a real helper rejection leaves both routes pending without payment effects', async () => {
  db.rpc.mockResolvedValue({ data: [], error: null })
  expect((await callback(callbackRequest()) as unknown as { url: string }).url).toContain('status=pending')
  expect((await (await status(statusRequest())).json()).status).toBe('pending')
  expect(processVerifiedPaymentOrder).not.toHaveBeenCalled()
  expect(sendPurchaseOnce).not.toHaveBeenCalled()
  expect(stored.payment_status).toBe('pending')
})
