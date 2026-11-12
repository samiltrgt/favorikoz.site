jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: jest.fn() }))
jest.mock('@/lib/tracking/meta', () => ({ deliverMeta: jest.fn(), buildMetaUserData: jest.fn(() => ({ em: ['hash'] })) }))
jest.mock('@/lib/tracking/google', () => ({ deliverGooglePurchase: jest.fn() }))
jest.mock('@/lib/tracking/ltv', () => ({ getPredictedLtv: jest.fn(() => Promise.resolve(25)) }))

import { parseBrowserEvent } from '@/lib/tracking/schema'
import { captureOrderTracking } from '@/lib/tracking/identity'
import { hashNormalized } from '@/lib/tracking/hash'
import { confirmOrderPayment } from '@/lib/tracking/payment'

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
