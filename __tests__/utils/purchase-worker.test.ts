jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: jest.fn() }))
jest.mock('@/lib/tracking/meta', () => ({ deliverMeta: jest.fn(), buildMetaUserData: jest.fn(() => ({ em: ['synthetic-hash'] })) }))
jest.mock('@/lib/tracking/google', () => ({ deliverGooglePurchase: jest.fn() }))
jest.mock('@/lib/tracking/ltv', () => ({ getPredictedLtv: jest.fn(async () => 25) }))

import { drainTrackingOutbox, retryDelaySeconds } from '@/lib/tracking/outbox'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { deliverMeta } from '@/lib/tracking/meta'
import { deliverGooglePurchase } from '@/lib/tracking/google'
import { getPredictedLtv } from '@/lib/tracking/ltv'

const purchase = () => ({ id: 'queue', order_id: 'order', owner_hash: 'a'.repeat(64), event_name: 'Purchase',
  event_id: 'SYNTHETIC-ORDER', event_time: 1700000000, attempts: 1, lease_token: 'lease',
  delivery: { meta: 'pending', ga4: 'pending' }, payload: {
    tracking: { consent: { marketing: true, analytics: true }, consent_owner: 'a'.repeat(64), consent_version: 1, client_id: '123.456' },
    order: { total: 10000, currency: 'TRY', shipping_cost: 1000, discount_amount: 0, items: [{ product_id: 'synthetic', price: 9000, quantity: 1 }] },
  } })

function database(rows: any[] = [purchase()]) {
  const rpc = jest.fn(async (name: string, _args?: any): Promise<any> => ({ data: {
    claim_tracking_outbox: rows, inspect_tracking_purchase: 'valid', authorize_tracking_purchase: 'allowed',
    complete_tracking_purchase: true, finish_tracking_purchase: 'sent',
  }[name], error: null }))
  const from = jest.fn(() => {
    const chain: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => ({ data: { marketing: true, analytics: true, status: 'processing', lease_token: 'lease', id: 'queue' }, error: null })) }
    return chain
  })
  jest.mocked(createSupabaseAdmin).mockReturnValue({ rpc, from } as any)
  return { rpc, from }
}

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(deliverMeta).mockResolvedValue()
  jest.mocked(deliverGooglePurchase).mockResolvedValue()
  jest.mocked(getPredictedLtv).mockResolvedValue(25)
  // resetAllMocks also resets buildMetaUserData's factory implementation.
  require('@/lib/tracking/meta').buildMetaUserData.mockReturnValue({ em: ['synthetic-hash'] })
})

test('valid Purchase reserves immediately before send, preserves event ID and checkpoints both channels', async () => {
  const db = database()
  expect(await drainTrackingOutbox()).toEqual({ claimed: 1, sent: 1, failed: 0 })
  expect(deliverMeta).toHaveBeenCalledWith(expect.objectContaining({ event_id: 'SYNTHETIC-ORDER', event_time: 1700000000,
    custom_data: expect.objectContaining({ value: 100, currency: 'TRY', order_id: 'SYNTHETIC-ORDER' }) }))
  const authorize = db.rpc.mock.calls.findIndex(([name]) => name === 'authorize_tracking_purchase')
  expect(db.rpc.mock.invocationCallOrder[authorize]).toBeLessThan(jest.mocked(deliverMeta).mock.invocationCallOrder[0])
  expect(jest.mocked(getPredictedLtv).mock.invocationCallOrder[0]).toBeLessThan(db.rpc.mock.invocationCallOrder[authorize])
  expect(db.rpc).toHaveBeenCalledWith('complete_tracking_purchase', expect.objectContaining({ p_outcome: 'sent', p_platform: 'meta' }))
  expect(db.from).not.toHaveBeenCalled() // No unguarded direct table checkpoint.
})

test.each(['quarantined', null, false, {}, 'allowed'])('inspection %p cannot authorize a send', async data => {
  const db = database(); const original = db.rpc.getMockImplementation()!
  db.rpc.mockImplementation(async (name, args) => name === 'inspect_tracking_purchase' ? { data, error: null } : original(name, args))
  if (data === 'quarantined') expect((await drainTrackingOutbox()).failed).toBe(1)
  else await expect(drainTrackingOutbox()).rejects.toThrow('tracking_batch_incomplete')
  expect(deliverMeta).not.toHaveBeenCalled(); expect(deliverGooglePurchase).not.toHaveBeenCalled()
  expect(getPredictedLtv).not.toHaveBeenCalled()
})

test.each(['quarantined', 'lease_lost', null, true])('final authorization %p blocks both providers', async data => {
  const db = database(); const original = db.rpc.getMockImplementation()!
  db.rpc.mockImplementation(async (name, args) => name === 'authorize_tracking_purchase' ? { data, error: null } : original(name, args))
  if (data === 'quarantined') await drainTrackingOutbox()
  else await expect(drainTrackingOutbox()).rejects.toThrow()
  expect(deliverMeta).not.toHaveBeenCalled(); expect(deliverGooglePurchase).not.toHaveBeenCalled()
})

test('503 preserves successful GA4 checkpoint and controlled retry delay', async () => {
  const db = database(); const original = db.rpc.getMockImplementation()!
  db.rpc.mockImplementation(async (name, args) => name === 'finish_tracking_purchase' ? { data: 'pending', error: null } : original(name, args))
  jest.mocked(deliverMeta).mockRejectedValue(new Error('meta_http_503'))
  expect(await drainTrackingOutbox()).toEqual({ claimed: 1, sent: 0, failed: 0 })
  expect(db.rpc).toHaveBeenCalledWith('complete_tracking_purchase', expect.objectContaining({ p_platform: 'meta', p_outcome: 'retryable' }))
  expect(db.rpc).toHaveBeenCalledWith('complete_tracking_purchase', expect.objectContaining({ p_platform: 'ga4', p_outcome: 'sent' }))
  expect(db.rpc).toHaveBeenLastCalledWith('finish_tracking_purchase', expect.objectContaining({ p_retry_seconds: 30 }))
  expect(retryDelaySeconds(20)).toBe(21600)
})

test('already sent Meta channel is never resent when GA4 resumes', async () => {
  const row = purchase(); row.delivery.meta = 'sent'; database([row]); await drainTrackingOutbox()
  expect(deliverMeta).not.toHaveBeenCalled(); expect(deliverGooglePurchase).toHaveBeenCalledTimes(1)
})

test('final SQL already_sent response fences stale delivery snapshot', async () => {
  const db = database(); const original = db.rpc.getMockImplementation()!
  db.rpc.mockImplementation(async (name, args) => name === 'authorize_tracking_purchase' ? { data: 'already_sent', error: null } : original(name, args))
  await drainTrackingOutbox(); expect(deliverMeta).not.toHaveBeenCalled(); expect(deliverGooglePurchase).not.toHaveBeenCalled()
})

test('ambiguous timeout is quarantined and not retried as a known rejection', async () => {
  const db = database(); jest.mocked(deliverMeta).mockRejectedValue(new Error('network_timeout'))
  expect((await drainTrackingOutbox()).failed).toBe(1)
  expect(db.rpc).toHaveBeenLastCalledWith('complete_tracking_purchase', expect.objectContaining({ p_outcome: 'uncertain' }))
  expect(deliverGooglePurchase).not.toHaveBeenCalled()
})

test('checkpoint loss leaves the SQL reservation in place and fails the batch', async () => {
  const db = database(); const original = db.rpc.getMockImplementation()!
  db.rpc.mockImplementation(async (name, args) => name === 'complete_tracking_purchase' ? { error: {} }
    : name === 'finish_tracking_purchase' ? { data: 'lease_lost', error: null } : original(name, args))
  await expect(drainTrackingOutbox()).rejects.toThrow('tracking_batch_incomplete')
  expect(deliverMeta).toHaveBeenCalledTimes(1); expect(deliverGooglePurchase).not.toHaveBeenCalled()
  expect(db.rpc).not.toHaveBeenCalledWith('finish_tracking_outbox', expect.anything())
})

test('transient DB error before reservation schedules a safe retry without HTTP', async () => {
  const db = database(); const original = db.rpc.getMockImplementation()!
  db.rpc.mockImplementation(async (name, args) => name === 'inspect_tracking_purchase' ? { error: {} }
    : name === 'finish_tracking_purchase' ? { data: 'pending', error: null } : original(name, args))
  expect((await drainTrackingOutbox()).sent).toBe(0); expect(deliverMeta).not.toHaveBeenCalled()
  expect(db.rpc).toHaveBeenLastCalledWith('finish_tracking_purchase', expect.objectContaining({ p_retry_seconds: 30 }))
})

test('refund or withdrawal during LTV construction is caught by final authorization', async () => {
  const db = database(); const original = db.rpc.getMockImplementation()!; let revoked = false
  jest.mocked(getPredictedLtv).mockImplementation(async () => { revoked = true; return 25 })
  db.rpc.mockImplementation(async (name, args) => name === 'authorize_tracking_purchase' && revoked ? { data: 'quarantined', error: null } : original(name, args))
  await drainTrackingOutbox(); expect(deliverMeta).not.toHaveBeenCalled(); expect(deliverGooglePurchase).not.toHaveBeenCalled()
})

test.each(['AddToCart', 'InitiateCheckout'])('%s retains browser outbox behavior without Purchase RPCs', async eventName => {
  const row: any = { ...purchase(), order_id: null, event_name: eventName, delivery: { meta: 'pending', ga4: 'skipped' },
    payload: { meta: { event_name: eventName, event_id: 'browser-event', user_data: { fbp: 'synthetic' }, custom_data: { value: 10 } } } }
  const db = database([row]); await drainTrackingOutbox()
  expect(deliverMeta).toHaveBeenCalledWith(row.payload.meta)
  expect(db.rpc).not.toHaveBeenCalledWith('inspect_tracking_purchase', expect.anything())
  expect(db.rpc).toHaveBeenCalledWith('finish_tracking_outbox', expect.objectContaining({ p_status: 'sent' }))
})

test('an orphan Purchase or forged browser Purchase cannot bypass the guard', async () => {
  const row: any = { ...purchase(), order_id: null, event_name: 'ViewContent', payload: { meta: { event_name: 'Purchase' } } }
  const db = database([row]); const original = db.rpc.getMockImplementation()!
  db.rpc.mockImplementation(async (name, args) => name === 'inspect_tracking_purchase' ? { data: 'quarantined', error: null } : original(name, args))
  await drainTrackingOutbox(); expect(deliverMeta).not.toHaveBeenCalled()
})

test('a quarantined row does not block a different valid row in the same batch', async () => {
  const invalid = { ...purchase(), id: 'invalid' }; const valid = { ...purchase(), id: 'valid' }
  const db = database([invalid, valid]); const original = db.rpc.getMockImplementation()!
  db.rpc.mockImplementation(async (name, args) => name === 'inspect_tracking_purchase' && args.p_id === 'invalid'
    ? { data: 'quarantined', error: null } : original(name, args))
  expect(await drainTrackingOutbox()).toEqual({ claimed: 2, sent: 1, failed: 1 })
  expect(deliverMeta).toHaveBeenCalledTimes(1); expect(deliverGooglePurchase).toHaveBeenCalledTimes(1)
})

test('terminal Meta checkpoint is preserved while approved GA4 finishes', async () => {
  const row = purchase(); row.delivery.meta = 'failed'; const db = database([row]); const original = db.rpc.getMockImplementation()!
  db.rpc.mockImplementation(async (name, args) => name === 'finish_tracking_purchase' ? { data: 'failed', error: null } : original(name, args))
  expect((await drainTrackingOutbox()).failed).toBe(1)
  expect(deliverMeta).not.toHaveBeenCalled(); expect(deliverGooglePurchase).toHaveBeenCalledTimes(1)
})
