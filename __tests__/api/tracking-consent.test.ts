jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: jest.fn() }))
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn(() => ({ allowed: true })), getClientIp: jest.fn(() => '1.2.3.4') }))
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init: { status?: number } = {}) => ({ status: init.status || 200, json: () => Promise.resolve(body) }) } }))
import { POST } from '@/app/api/tracking/consent/route'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { trackingOwnerFromRequest } from '@/lib/tracking/identity'
const ownerCookie = 'fk_tracking_owner=12345678-1234-1234-1234-123456789abc; fk_consent_version=1700000000000'
function request(preferences = 'fk_consent=denied; fk_consent_analytics=granted', body = {}, origin = 'https://shop.test', owner = ownerCookie) {
  return new Request('https://shop.test/api/tracking/consent', { method: 'POST', headers: { origin, cookie: `${preferences}; ${owner}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }) as any
}
const rpc = jest.fn()
beforeEach(() => { jest.clearAllMocks(); (createSupabaseAdmin as jest.Mock).mockReturnValue({ rpc }); rpc.mockResolvedValue({ data: true, error: null }) })
test('cookie-owned withdrawal ignores arbitrary body owner/order identifiers and separates channels', async () => {
  const req = request(undefined, { owner_hash: 'victim', order_id: 'victim', marketing: true })
  expect((await POST(req)).status).toBe(200)
  expect(rpc).toHaveBeenCalledWith('update_tracking_consent', { p_owner_hash: trackingOwnerFromRequest(req), p_version: 1700000000000, p_analytics: true, p_marketing: false })
  expect(trackingOwnerFromRequest(req)).toMatch(/^[a-f0-9]{64}$/)
})
test('unknown owner, invalid preference and foreign origin cannot change server state', async () => {
  expect((await POST(request(undefined, {}, undefined, ''))).status).toBe(400)
  expect((await POST(request('fk_consent=malformed'))).status).toBe(400)
  expect((await POST(request(undefined, {}, 'https://evil.test'))).status).toBe(403)
  expect(rpc).not.toHaveBeenCalled()
})
test('stale preference returns409 and unavailable database cannot acknowledge withdrawal', async () => {
  rpc.mockResolvedValueOnce({ data: false, error: null })
  expect((await POST(request())).status).toBe(409)
  rpc.mockResolvedValueOnce({ data: null, error: { code: 'unavailable' } })
  expect((await POST(request())).status).toBe(503)
})
