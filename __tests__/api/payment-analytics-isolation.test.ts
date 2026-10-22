jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, options?: { status?: number }) => ({
  status: options?.status ?? 200, json: async () => body,
}) } }))
const mockDb = { from: jest.fn(), rpc: jest.fn() }
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: () => mockDb }))
jest.mock('@/lib/iyzico', () => ({ retrievePayment: jest.fn(), retrievePaymentByPaymentId: jest.fn(), complete3DSPaymentV2: jest.fn() }))
jest.mock('@/lib/nes', () => ({ isNesConfigured: () => false, createEArchiveInvoice: jest.fn() }))
jest.mock('@/lib/order-email', () => ({ trySendOrderConfirmationEmail: jest.fn() }))
jest.mock('@/lib/tracking/meta', () => ({ deliverMeta: jest.fn(), buildMetaUserData: jest.fn() }))
jest.mock('@/lib/tracking/google', () => ({ deliverGooglePurchase: jest.fn() }))

import { GET } from '@/app/api/payment/status/route'
import { trySendOrderConfirmationEmail } from '@/lib/order-email'
import { deliverMeta } from '@/lib/tracking/meta'
import { retrievePayment } from '@/lib/iyzico'

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  const order = { id: 'paid-order', order_number: 'UNIT-PAID', payment_status: 'completed', status: 'paid',
    total: 0, shipping_cost: 0, items: [], tracking: { consent: { marketing: true, analytics: false } } }
  mockDb.from.mockImplementation(() => {
    const chain: any = {}
    for (const method of ['select', 'eq', 'limit']) chain[method] = jest.fn(() => chain)
    chain.maybeSingle = jest.fn(async () => ({ data: order, error: null }))
    return chain
  })
  mockDb.rpc.mockImplementation(async (name) => ({ data: name === 'claim_tracking_outbox' ? [{
    id: 'invalid-outbox', order_id: order.id, event_name: 'Purchase', event_id: order.order_number,
    event_time: 1700000000, attempts: 1, lease_token: 'unit-lease',
    delivery: { meta: 'pending', ga4: 'skipped' }, payload: { order, tracking: order.tracking },
  }] : null, error: null }))
})
afterEach(() => jest.restoreAllMocks())

test('real postprocessing/outbox code preserves paid response and email when Meta value is invalid', async () => {
  const response = await GET({ url: 'https://shop.test/api/payment/status?token=opaque-unit-token' } as any)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ success: true, status: 'success', analytics: { order_number: 'UNIT-PAID', value: 0 } })
  expect(trySendOrderConfirmationEmail).toHaveBeenCalledWith(mockDb, { paymentToken: 'opaque-unit-token', orderNumber: 'UNIT-PAID' })
  expect(deliverMeta).not.toHaveBeenCalled()
  expect(retrievePayment).not.toHaveBeenCalled()
  expect(mockDb.rpc).toHaveBeenCalledWith('finish_tracking_outbox', expect.objectContaining({ p_status: 'failed', p_delivery: { meta: 'failed', ga4: 'skipped' } }))
  expect(fetch).not.toHaveBeenCalled()
})

test('even a failed tracking checkpoint cannot change the paid response or stop confirmation email', async () => {
  const implementation = mockDb.rpc.getMockImplementation()!
  mockDb.rpc.mockImplementation(async (name, ...args) => name === 'finish_tracking_outbox'
    ? { data: null, error: { message: 'isolated-checkpoint-failure' } }
    : implementation(name, ...args))
  expect(await (await GET({ url: 'https://shop.test/api/payment/status?token=opaque-unit-token' } as any)).json())
    .toMatchObject({ success: true, status: 'success' })
  expect(trySendOrderConfirmationEmail).toHaveBeenCalled()
  expect(deliverMeta).not.toHaveBeenCalled()
})
