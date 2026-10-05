jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/tracking/outbox', () => ({ enqueueBrowserEvent: jest.fn(), drainTrackingOutbox: jest.fn() }))
jest.mock('@/lib/tracking/meta', () => ({ buildMetaUserData: jest.fn(() => ({ client_user_agent: 'browser' })) }))
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServer: jest.fn() }))
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn(() => ({ allowed: true })), getClientIp: jest.fn(() => '1.2.3.4') }))
jest.mock('next/server', () => {
  class MockResponse {
    status: number
    body: unknown
    constructor(body: unknown, init: { status?: number } = {}) { this.body = body; this.status = init.status || 200 }
    json() { return Promise.resolve(this.body) }
    static json(body: unknown, init: { status?: number } = {}) { return new MockResponse(body, init) }
  }
  return { NextResponse: MockResponse }
})

import { POST } from '@/app/api/e/route'
import { enqueueBrowserEvent, drainTrackingOutbox } from '@/lib/tracking/outbox'
const event = { eventName: 'ViewContent', eventId: 'evt_unique_123', eventSourceUrl: 'https://shop.test/products/a', currency: 'TRY', value: 10, contents: [{ id: 'a', quantity: 1, item_price: 10 }], consent: { analytics: true, marketing: true } }
function request(body: unknown = event, cookie = 'fk_consent=granted', origin = 'https://shop.test') {
  return new Request('https://shop.test/api/e', { method: 'POST', headers: { origin, cookie: `${cookie}; fk_tracking_owner=12345678-1234-1234-1234-123456789abc; fk_consent_version=1700000000000`, 'content-type': 'application/json', 'user-agent': 'browser' }, body: JSON.stringify(body) }) as any
}
beforeEach(() => {
  jest.clearAllMocks()
  ;(enqueueBrowserEvent as jest.Mock).mockResolvedValue(undefined)
  ;(drainTrackingOutbox as jest.Mock).mockResolvedValue({ claimed: 1, sent: 1, failed: 0 })
})
test('denied cookie does not enqueue or deliver despite forged body approval', async () => {
  expect((await POST(request(event, 'fk_consent=denied'))).status).toBe(204)
  expect(enqueueBrowserEvent).not.toHaveBeenCalled()
  expect(drainTrackingOutbox).not.toHaveBeenCalled()
})
test('durably accepted event stays accepted if immediate delivery fails', async () => {
  ;(drainTrackingOutbox as jest.Mock).mockRejectedValue(new Error('tracking_claim_failed'))
  const result = await POST(request())
  expect(result.status).toBe(202)
  expect(await result.json()).toEqual({ accepted: true })
  expect(enqueueBrowserEvent).toHaveBeenCalledWith(expect.objectContaining({ event_name: 'ViewContent', event_id: 'evt_unique_123' }), expect.objectContaining({ consent_owner: expect.stringMatching(/^[a-f0-9]{64}$/) }))
  expect(drainTrackingOutbox).toHaveBeenCalledWith({ limit: 10 })
  expect((enqueueBrowserEvent as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((drainTrackingOutbox as jest.Mock).mock.invocationCallOrder[0])
})
test('enqueue failure returns unavailable without sending non-durable event', async () => {
  ;(enqueueBrowserEvent as jest.Mock).mockRejectedValue(new Error('tracking_enqueue_failed'))
  expect((await POST(request())).status).toBe(503)
  expect(drainTrackingOutbox).not.toHaveBeenCalled()
})
test('forged Purchase and foreign-origin requests cannot reach delivery', async () => {
  expect((await POST(request({ ...event, eventName: 'Purchase' }))).status).toBe(400)
  expect((await POST(request(event, 'fk_consent=granted', 'https://evil.test'))).status).toBe(403)
  expect(enqueueBrowserEvent).not.toHaveBeenCalled()
})
