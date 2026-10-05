jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: jest.fn() }))
jest.mock('@/lib/tracking/meta', () => ({ deliverMeta: jest.fn(), buildMetaUserData: jest.fn(() => ({ em: ['hash'] })) }))
jest.mock('@/lib/tracking/google', () => ({ deliverGooglePurchase: jest.fn() }))
jest.mock('@/lib/tracking/ltv', () => ({ getPredictedLtv: jest.fn(() => Promise.resolve(25)) }))

import { parseBrowserEvent } from '@/lib/tracking/schema'
import { captureOrderTracking } from '@/lib/tracking/identity'
import { hashNormalized } from '@/lib/tracking/hash'
import { confirmOrderPayment } from '@/lib/tracking/payment'
import { drainTrackingOutbox, retryDelaySeconds } from '@/lib/tracking/outbox'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { deliverMeta } from '@/lib/tracking/meta'
import { deliverGooglePurchase } from '@/lib/tracking/google'
import { getPredictedLtv } from '@/lib/tracking/ltv'

const origin = 'https://shop.test'
const browserEvent = { eventName: 'ViewContent', eventId: 'evt_unique_123', eventSourceUrl: `${origin}/products/a?email=private#token`, currency: 'TRY', value: 10, contents: [{ id: 'a', quantity: 1, item_price: 10 }] }
const approved = { analytics: true, marketing: true }
function request(cookies = '', headers: Record<string, string> = {}) { return new Request(`${origin}/api/payment`, { headers: { cookie: cookies ? `${cookies}; fk_tracking_owner=12345678-1234-1234-1234-123456789abc; fk_consent_version=1700000000000` : '', ...headers } }) }

describe('Server tracking trust boundaries', () => {
  test('rejects forged Purchase, foreign source, nonfinite values and malformed quantities', () => {
    expect(parseBrowserEvent({ ...browserEvent, eventName: 'Purchase' }, origin)).toBeNull()
    expect(parseBrowserEvent({ ...browserEvent, eventSourceUrl: 'https://evil.test/' }, origin)).toBeNull()
    expect(parseBrowserEvent({ ...browserEvent, value: Infinity }, origin)).toBeNull()
    expect(parseBrowserEvent({ ...browserEvent, contents: [{ id: 'a', quantity: 0.5, item_price: 1 }] }, origin)).toBeNull()
    expect(parseBrowserEvent(browserEvent, origin)?.eventSourceUrl).toBe(`${origin}/products/a`)
  })
  test('request cookies determine consent, forged body consent and identities cannot override', () => {
    const result = captureOrderTracking(request(), { consent: approved, external_id: 'forged', ip: '1.2.3.4', fbp: 'fb.1.1700000000000.1234', google_client_id: '123.456' }, 'verified')
    expect(result).toEqual({ consent: { analytics: false, marketing: false } })
  })
  test('analytics-only preserves GA IDs and drops advertising identifiers/IP', () => {
    const result = captureOrderTracking(request('fk_consent=denied; fk_consent_analytics=granted', { 'x-forwarded-for': '1.2.3.4' }), { google_client_id: '123.456', gclid: 'advertising', fbp: 'fb.1.1700000000000.1234' }, 'verified')
    expect(result.consent).toEqual({ analytics: true, marketing: false })
    expect(result.client_id).toBe('123.456')
    for (const field of ['gclid', 'fbp', 'external_id', 'ip']) expect(result[field]).toBeUndefined()
  })
  test('marketing-only excludes analytics IDs and captures verified identity/proxy IP', () => {
    const result = captureOrderTracking(request('fk_consent=granted; fk_consent_analytics=denied', { 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'user-agent': 'browser' }), { google_client_id: '123.456', google_session_id: '12', fbp: 'fb.1.1700000000000.1234' }, 'verified')
    expect(result.consent).toEqual({ analytics: false, marketing: true })
    expect(result.client_id).toBeUndefined()
    expect(result.session_id).toBeUndefined()
    expect(result.external_id).toBe('verified')
    expect(result.ip).toBe('1.2.3.4')
  })
  test('email normalization is locale-independent; phone handles Turkish and international numbers', () => {
    expect(hashNormalized(' USER@EXAMPLE.COM ')).toBe(hashNormalized('user@example.com'))
    expect(hashNormalized('0532 111 22 33', 'phone')).toBe(hashNormalized('+90 532 111 22 33', 'phone'))
    expect(hashNormalized('+44 7700 900123', 'phone')).toBe(hashNormalized('0044 7700 900123', 'phone'))
  })
  test('payment RPC passes both identifiers and rejects empty/no-active result', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null })
    await expect(confirmOrderPayment({ rpc }, { paymentToken: 'token', orderNumber: 'unrelated' })).rejects.toThrow('payment_confirmation_failed')
    expect(rpc).toHaveBeenCalledWith('confirm_tracking_payment', { p_payment_token: 'token', p_order_number: 'unrelated' })
    await expect(confirmOrderPayment({ rpc }, { paymentToken: '' })).rejects.toThrow('payment_token_required')
  })
})

describe('Durable outbox retry and delivery isolation', () => {
  beforeEach(() => { jest.clearAllMocks() })
  const purchase = { id: 'outbox', order_id: 'order', event_name: 'Purchase', event_id: 'FK-1', event_time: 1700000000, attempts: 1, lease_token: 'lease', delivery: { meta: 'pending', ga4: 'pending' }, payload: { tracking: { consent: approved, client_id: '123.456' }, order: { total: 10000, shipping_cost: 1000, discount_amount: 0, items: [{ product_id: 'a', price: 9000, quantity: 1 }] } } }
  function database(row = purchase, current: any = { payment_status: 'completed', status: 'paid', tracking: { consent: approved } }) {
    const rpc = jest.fn().mockImplementation((name) => Promise.resolve({ data: name === 'claim_tracking_outbox' ? [row] : null, error: null }))
    const chain: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis(), maybeSingle: jest.fn(() => Promise.resolve({ data: current, error: null })), then: (resolve: (value: any) => unknown) => Promise.resolve({ error: null }).then(resolve) }
    const from = jest.fn(() => chain)
    ;(createSupabaseAdmin as jest.Mock).mockReturnValue({ rpc, from })
    return { rpc, from }
  }
  test('failure retries with original timestamp and successful platform checkpoint', async () => {
    const db = database()
    ;(deliverMeta as jest.Mock).mockRejectedValue(new Error('meta_http_503'))
    ;(deliverGooglePurchase as jest.Mock).mockResolvedValue(undefined)
    expect(await drainTrackingOutbox()).toEqual({ claimed: 1, sent: 0, failed: 0 })
    expect(deliverMeta).toHaveBeenCalledWith(expect.objectContaining({ event_time: 1700000000, event_id: 'FK-1', custom_data: expect.objectContaining({ value: 100 }) }))
    expect(db.rpc).toHaveBeenLastCalledWith('finish_tracking_outbox', expect.objectContaining({ p_status: 'pending', p_delivery: { meta: 'pending', ga4: 'sent' }, p_retry_seconds: 30 }))
  })
  test('a successful platform is never retried when the other resumes', async () => {
    const db = database({ ...purchase, delivery: { meta: 'sent', ga4: 'pending' }, attempts: 2 })
    ;(deliverGooglePurchase as jest.Mock).mockResolvedValue(undefined)
    expect(await drainTrackingOutbox()).toEqual({ claimed: 1, sent: 1, failed: 0 })
    expect(deliverMeta).not.toHaveBeenCalled()
    expect(db.rpc).toHaveBeenLastCalledWith('finish_tracking_outbox', expect.objectContaining({ p_status: 'sent', p_delivery: { meta: 'sent', ga4: 'sent' } }))
  })
  test('cancelled orders suppress both deliveries and cannot revive via retry', async () => {
    const db = database(purchase, { status: 'cancelled', payment_status: 'completed' })
    await drainTrackingOutbox()
    expect(deliverMeta).not.toHaveBeenCalled()
    expect(deliverGooglePurchase).not.toHaveBeenCalled()
    expect(db.rpc).toHaveBeenLastCalledWith('finish_tracking_outbox', expect.objectContaining({ p_status: 'suppressed' }))
  })
  test('attempt 12 is terminal and delay remains bounded', async () => {
    const db = database({ ...purchase, attempts: 12 })
    ;(deliverMeta as jest.Mock).mockRejectedValue(new Error('meta_http_503'))
    ;(deliverGooglePurchase as jest.Mock).mockRejectedValue(new Error('ga4_http_503'))
    expect(await drainTrackingOutbox()).toEqual({ claimed: 1, sent: 0, failed: 1 })
    expect(db.rpc).toHaveBeenLastCalledWith('finish_tracking_outbox', expect.objectContaining({ p_status: 'failed' }))
    expect(retryDelaySeconds(20)).toBe(21600)
  })
  function ownerDatabase(row: any, owner: any) {
    const rpc = jest.fn().mockImplementation((name) => Promise.resolve({ data: name === 'claim_tracking_outbox' ? [row] : null, error: null }))
    const from = jest.fn((table) => {
      const data = table === 'tracking_consent' ? owner : table === 'orders' ? { payment_status: 'completed', status: 'paid', tracking: { consent: approved } } : { id: row.id, status: 'processing', lease_token: row.lease_token }
      const chain: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis(), maybeSingle: jest.fn(() => Promise.resolve({ data, error: null })) }
      return chain
    })
    ;(createSupabaseAdmin as jest.Mock).mockReturnValue({ rpc, from })
    return { rpc, from }
  }
  test('Meta503 then owner marketing withdrawal prevents Meta retry despite old captured grant', async () => {
    const row = { ...purchase, owner_hash: 'a'.repeat(64) }
    ownerDatabase(row, approved)
    ;(deliverMeta as jest.Mock).mockRejectedValue(new Error('meta_http_503'))
    ;(deliverGooglePurchase as jest.Mock).mockResolvedValue(undefined)
    await drainTrackingOutbox()
    expect(deliverMeta).toHaveBeenCalledTimes(1)
    jest.clearAllMocks()
    ownerDatabase({ ...row, attempts: 2, delivery: { meta: 'pending', ga4: 'sent' } }, { analytics: true, marketing: false })
    await drainTrackingOutbox()
    expect(deliverMeta).not.toHaveBeenCalled()
    expect(deliverGooglePurchase).not.toHaveBeenCalled()
  })
  test('analytics withdrawal preserves approved Meta and prevents pending GA4', async () => {
    ownerDatabase({ ...purchase, owner_hash: 'a'.repeat(64) }, { analytics: false, marketing: true })
    ;(deliverMeta as jest.Mock).mockResolvedValue(undefined)
    await drainTrackingOutbox()
    expect(deliverMeta).toHaveBeenCalledTimes(1)
    expect(deliverGooglePurchase).not.toHaveBeenCalled()
  })
  test('anonymous queued event uses owner revocation boundary', async () => {
    ownerDatabase({ ...purchase, order_id: null, owner_hash: 'a'.repeat(64), delivery: { meta: 'pending', ga4: 'skipped' }, payload: { meta: { user_data: { fbp: 'approved-before-revoke' } } } }, { analytics: false, marketing: false })
    await drainTrackingOutbox()
    expect(deliverMeta).not.toHaveBeenCalled()
    expect(deliverGooglePurchase).not.toHaveBeenCalled()
  })
  test('missing owner state fails closed and retries without external delivery', async () => {
    const db = ownerDatabase({ ...purchase, owner_hash: 'a'.repeat(64) }, null)
    await drainTrackingOutbox()
    expect(deliverMeta).not.toHaveBeenCalled()
    expect(deliverGooglePurchase).not.toHaveBeenCalled()
    expect(db.rpc).toHaveBeenLastCalledWith('finish_tracking_outbox', expect.objectContaining({ p_status: 'pending', p_error: 'tracking_consent_unavailable' }))
  })
  test('withdrawal committed during awaited LTV lookup blocks the constructed PII event', async () => {
    const owner = { analytics: true, marketing: true }
    ownerDatabase({ ...purchase, owner_hash: 'a'.repeat(64) }, owner)
    ;(getPredictedLtv as jest.Mock).mockImplementationOnce(async () => { owner.marketing = false; return 25 })
    ;(deliverGooglePurchase as jest.Mock).mockResolvedValue(undefined)
    await drainTrackingOutbox()
    expect(deliverMeta).not.toHaveBeenCalled()
    expect(deliverGooglePurchase).toHaveBeenCalledTimes(1)
  })
})
