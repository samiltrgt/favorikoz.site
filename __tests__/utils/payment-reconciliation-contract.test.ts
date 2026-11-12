import { reconcileVerifiedPayment } from '@/lib/payment-reconciliation'
import type { IyzicoPaymentResult } from '@/lib/iyzico'

// Characterize the existing persistence boundary; provider reporting and real SQL
// idempotency remain separate integration checks. No bank or database is contacted.
function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 'synthetic-order', order_number: 'SYNTHETIC-ORDER', payment_token: 'local-opaque-token',
    status: 'pending', payment_status: 'pending', iyzico_payment_id: null as string | null,
    iyzico_basket_id: 'synthetic-basket', total: 12500, shipping_cost: 0,
    items: [{ price: 12500, quantity: 1 }], ...overrides,
  }
}

function providerResult(overrides: Partial<IyzicoPaymentResult> = {}): IyzicoPaymentResult {
  return {
    status: 'success', paymentStatus: 'SUCCESS', paymentId: '1234567',
    basketId: 'synthetic-basket', currency: 'TRY', paidPrice: '125.00', ...overrides,
  }
}

const db = { rpc: jest.fn() }
const canonical = () => ({
  ...order(), status: 'paid', payment_status: 'completed', iyzico_payment_id: '1234567',
  payment_verified_at: '2026-01-01T00:00:00.000Z',
})

beforeEach(() => {
  jest.clearAllMocks()
  db.rpc.mockResolvedValue({ data: [canonical()], error: null })
})

afterEach(() => {
  expect(fetch).not.toHaveBeenCalled()
})

test('persists canonical order, provider ID, basket and integer kurus through one RPC', async () => {
  expect(await reconcileVerifiedPayment(db, order(), providerResult())).toEqual(canonical())
  expect(db.rpc).toHaveBeenCalledTimes(1)
  expect(db.rpc).toHaveBeenCalledWith('reconcile_verified_payment', {
    p_order_id: 'synthetic-order', p_payment_id: '1234567',
    p_basket_id: 'synthetic-basket', p_total: 12500,
  })
})

test.each<Partial<IyzicoPaymentResult>>([
  { status: 'failure' },
  { paymentStatus: 'FAILURE' },
  { paymentStatus: 'CALLBACK_THREEDS' },
  { paymentId: undefined },
  { paymentId: '' },
  { basketId: 'foreign-basket' },
  { currency: 'USD' },
  { paidPrice: '125.01' },
  { paidPrice: Number.NaN },
  { paidPrice: Number.POSITIVE_INFINITY },
])('rejects an invalid provider binding before SQL: %j', async (overrides) => {
  await expect(reconcileVerifiedPayment(db, order(), providerResult(overrides))).rejects.toThrow('payment_binding_invalid')
  expect(db.rpc).not.toHaveBeenCalled()
})

test.each([{ status: 'refunded' }, { payment_status: 'refunded' }])('cannot restore an already refunded order: %j', async (overrides) => {
  await expect(reconcileVerifiedPayment(db, order(overrides), providerResult())).rejects.toThrow('payment_binding_invalid')
  expect(db.rpc).not.toHaveBeenCalled()
})

test('rejects a different payment ID already bound to the order', async () => {
  await expect(reconcileVerifiedPayment(db, order({ iyzico_payment_id: '7654321' }), providerResult())).rejects.toThrow('payment_binding_invalid')
  expect(db.rpc).not.toHaveBeenCalled()
})

test('accepts a retry for the same bound payment ID', async () => {
  await reconcileVerifiedPayment(db, order({ iyzico_payment_id: '1234567' }), providerResult())
  expect(db.rpc).toHaveBeenCalledWith('reconcile_verified_payment', expect.objectContaining({ p_payment_id: '1234567' }))
})

test.each(['shipped', 'completed', 'cancelled'])('returns canonical %s status without asking SQL to reset fulfilment', async (status) => {
  const saved = { ...canonical(), status }
  db.rpc.mockResolvedValue({ data: [saved], error: null })
  const result = await reconcileVerifiedPayment(db, order({ status, payment_status: 'failed' }), providerResult())
  expect(result).toEqual(saved)
  expect(db.rpc.mock.calls[0][1]).toEqual({
    p_order_id: 'synthetic-order', p_payment_id: '1234567', p_basket_id: 'synthetic-basket', p_total: 12500,
  })
})

test('also accepts the canonical row returned as an object', async () => {
  db.rpc.mockResolvedValue({ data: canonical(), error: null })
  expect(await reconcileVerifiedPayment(db, order(), providerResult())).toEqual(canonical())
})

test.each([
  { data: null, error: null },
  { data: [], error: null },
  { data: [{ ...canonical(), payment_status: 'pending' }], error: null },
  { data: [canonical()], error: { message: 'synthetic SQL failure' } },
])('does not report completion when RPC rejects or fails: %j', async (response) => {
  db.rpc.mockResolvedValue(response)
  await expect(reconcileVerifiedPayment(db, order(), providerResult())).rejects.toThrow('payment_reconciliation_failed')
})

test('repeated reconciliation addresses the same payment/order without inventing an event identity', async () => {
  const input = order()
  const provider = providerResult()
  const inputBefore = JSON.stringify(input)
  const providerBefore = JSON.stringify(provider)
  const first = await reconcileVerifiedPayment(db, input, provider)
  const second = await reconcileVerifiedPayment(db, input, provider)
  expect(first.order_number).toBe('SYNTHETIC-ORDER')
  expect(second.order_number).toBe(first.order_number)
  expect(db.rpc.mock.calls[0]).toEqual(db.rpc.mock.calls[1])
  expect(JSON.stringify(input)).toBe(inputBefore)
  expect(JSON.stringify(provider)).toBe(providerBefore)
})
