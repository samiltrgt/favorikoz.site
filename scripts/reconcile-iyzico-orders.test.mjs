import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { parseArgs, toKurus, verifyPayment, reconcileOrders, providerRequest } from './reconcile-iyzico-orders.mjs'

const order = { id: '1', order_number: 'ORD-1-A', status: 'cancelled', payment_status: 'failed', payment_method: 'iyzico', total: 74000, iyzico_basket_id: 'basket', payment_token: 'token', updated_at: '2026-10-06T00:00:00Z' }
const retrieved = { status: 'success', paymentStatus: 'SUCCESS', paymentId: '42', basketId: 'basket', paidPrice: '740.00', currency: 'TRY' }
const payment = { paymentId: '42', paymentConversationId: 'token', basketId: 'basket', paidPrice: 740, currency: 'TRY', paymentStatus: 1, fraudStatus: 1, paymentRefundStatus: 'NOT_REFUNDED', cancels: [], itemTransactions: [{ transactionStatus: 2, refunds: [] }] }
const report = p => ({ status: 'success', payments: [p] })

test('explicit distinct allowlist required; dry-run default', () => {
  assert.throws(() => parseArgs(['--apply']))
  assert.throws(() => parseArgs(['--allow', 'ORD-1-A:42', '--allow', 'ORD-2-A:42']))
  assert.equal(parseArgs(['--allow', 'ORD-1-A:42']).apply, false)
})

test('integer kuruş comparison refuses rounding, invalid money', () => {
  assert.equal(toKurus('740.00'), 74000)
  assert.equal(toKurus('740.0100'), 74001)
  for (const value of ['740.001', '', 'NaN', null, true, '-1', '1e2']) assert.equal(toKurus(value), null)
})

test('only exact identity/amount/currency with unreversed approved provider evidence verifies', () => {
  assert.equal(verifyPayment(order, '42', retrieved, report(payment)), 'verified')
  for (const patch of [{ paymentId: '43' }, { basketId: 'other' }, { paidPrice: 740.01 }, { currency: 'USD' }, { paymentStatus: undefined }, { status: 'failure' }]) {
    assert.notEqual(verifyPayment(order, '42', { ...retrieved, ...patch }, report(payment)), 'verified')
  }
  for (const patch of [{ paymentId: '43' }, { paymentConversationId: 'other' }, { paidPrice: 741 }, { currency: 'USD' }, { fraudStatus: 0 }, { paymentRefundStatus: 'PARTIALLY_REFUNDED' }, { paymentRefundStatus: undefined }, { cancels: [{}] }, { itemTransactions: [] }, { itemTransactions: [{ transactionStatus: 2, refunds: [{}] }] }, { itemTransactions: [{ transactionStatus: -1 }] }]) {
    assert.notEqual(verifyPayment(order, '42', retrieved, report({ ...payment, ...patch })), 'verified')
  }
  assert.notEqual(verifyPayment(order, '42', retrieved, { status: 'success', payments: [payment, payment] }), 'verified')
  assert.notEqual(verifyPayment({ ...order, payment_status: 'refunded' }, '42', retrieved, report(payment)), 'verified')
})

function fakeDatabase(updatedRows = [{ ...order, payment_status: 'completed' }]) {
  const mutations = []
  return {
    mutations,
    from() {
      let updating = false
      const filters = []
      const chain = {
        select() { return updating ? Promise.resolve({ data: updatedRows, error: null }) : chain },
        eq(key, value) { filters.push([key, value]); return chain },
        is(key, value) { filters.push([key, value]); return chain },
        maybeSingle() { return Promise.resolve({ data: order, error: null }) },
        update(payload) { updating = true; mutations.push({ payload, filters }); return chain },
      }
      return chain
    },
  }
}

test('dry-run freshly queries providers but never writes', async () => {
  const supabase = fakeDatabase()
  let calls = 0
  const reports = await reconcileOrders({ allow: [{ orderNumber: order.order_number, paymentId: '42' }], apply: false }, { supabase, retrieve: async () => { calls++; return retrieved }, report: async () => { calls++; return report(payment) } })
  assert.equal(calls, 2)
  assert.equal(supabase.mutations.length, 0)
  assert.equal(reports[0].result, 'would_update')
  assert.equal(reports[0].fulfillmentReview, true)
})

test('apply changes only payment status and compares full order snapshot', async () => {
  const supabase = fakeDatabase()
  const reports = await reconcileOrders({ allow: [{ orderNumber: order.order_number, paymentId: '42' }], apply: true }, { supabase, retrieve: async () => retrieved, report: async () => report(payment) })
  assert.equal(reports[0].result, 'updated')
  assert.deepEqual(supabase.mutations[0].payload, { payment_status: 'completed' })
  assert.deepEqual(Object.fromEntries(supabase.mutations[0].filters), order)
})

test('concurrent edit causes zero-row update; unsafe evidence causes no update', async () => {
  const supabase = fakeDatabase([])
  const options = { allow: [{ orderNumber: order.order_number, paymentId: '42' }], apply: true }
  const reports = await reconcileOrders(options, { supabase, retrieve: async () => retrieved, report: async () => report(payment) })
  assert.equal(reports[0].result, 'concurrent_change')
  const unsafeDb = fakeDatabase()
  await reconcileOrders(options, { supabase: unsafeDb, retrieve: async () => retrieved, report: async () => report({ ...payment, paymentRefundStatus: 'PARTIALLY_REFUNDED' }) })
  assert.equal(unsafeDb.mutations.length, 0)
})

test('provider-confirmed full refund maps only to refunded and preserves cancelled fulfillment', async () => {
  const refunded = { ...payment, paymentRefundStatus: 'TOTALLY_REFUNDED', basketId: 'provider-internal-basket' }
  assert.equal(verifyPayment(order, '42', retrieved, report(refunded)), 'verified_refunded')
  const supabase = fakeDatabase([{ ...order, payment_status: 'refunded' }])
  const reports = await reconcileOrders({ allow: [{ orderNumber: order.order_number, paymentId: '42' }], apply: true }, { supabase, retrieve: async () => retrieved, report: async () => report(refunded) })
  assert.equal(reports[0].result, 'updated')
  assert.equal(reports[0].targetPaymentStatus, 'refunded')
  assert.equal(reports[0].preservedStatus, 'cancelled')
  assert.deepEqual(supabase.mutations[0].payload, { payment_status: 'refunded' })
})

test('provider requests use only read endpoints, GET has no body, HTTP failures stop', async () => {
  const credentials = { apiKey: 'key', secretKey: 'secret', baseUrl: 'https://sandbox-api.iyzipay.com' }
  let request
  await providerRequest(credentials, '/v2/reporting/payment/details', { locale: 'tr', paymentId: '42' }, 'GET', async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({}) } })
  assert.equal(request.url, 'https://sandbox-api.iyzipay.com/v2/reporting/payment/details?locale=tr&paymentId=42')
  assert.equal(request.options.body, undefined)
  assert.equal(request.options.method, 'GET')
  const auth = Object.fromEntries(Buffer.from(request.options.headers.Authorization.slice(8), 'base64').toString().split('&').map(part => part.split(':')))
  assert.equal(auth.signature, createHmac('sha256', credentials.secretKey).update(auth.randomKey + '/v2/reporting/payment/details').digest('hex'))
  await assert.rejects(providerRequest(credentials, '/payment/detail', { paymentId: '42' }, 'POST', async () => ({ ok: false, status: 401 })))
})
