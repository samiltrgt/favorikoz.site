import { GET, POST } from '@/app/auth/callback/route'
import { recoverySessionProof, RECOVERY_COOKIE } from '@/lib/auth-email'

jest.mock('server-only', () => ({}))
const mockAuth = { exchangeCodeForSession: jest.fn(), verifyOtp: jest.fn(), setSession: jest.fn(), getUser: jest.fn() }
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServer: jest.fn(() => ({ auth: mockAuth })) }))
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: string) => ({ url, headers: new Headers(), cookies: { set: jest.fn() } }),
    json: (body: unknown, options?: { status: number }) => ({ body, status: options?.status || 200, headers: new Headers(), cookies: { set: jest.fn() } }),
  },
}))
const session = { access_token: 'verified-session-token' }
const user = { id: 'customer', email_confirmed_at: '2026-10-09T09:29:36Z' }
const request = (query = '', body?: unknown, origin = 'https://favorikozmetik.com') => ({
  nextUrl: new URL(`https://favorikozmetik.com/auth/callback${query}`),
  headers: new Headers({ origin }), json: async () => body,
}) as any

describe('email auth callback', () => {
  beforeEach(() => jest.clearAllMocks())
  it('confirms signup and does not grant password recovery even with a forged type', async () => {
    mockAuth.exchangeCodeForSession.mockResolvedValue({ data: { session, user, redirectType: null }, error: null })
    const response = await GET(request('?code=signup-code&type=recovery')) as any
    expect(response.url).toBe('https://favorikozmetik.com/auth/dogrulama')
    expect(response.cookies.set).toHaveBeenCalledWith(RECOVERY_COOKIE, '', expect.objectContaining({ maxAge: 0 }))
  })
  it('grants bounded recovery only after exchanging the recovery PKCE verifier', async () => {
    mockAuth.exchangeCodeForSession.mockResolvedValue({ data: { session, user, redirectType: 'PASSWORD_RECOVERY' }, error: null })
    const response = await GET(request('?code=reset-code')) as any
    expect(response.url).toBe('https://favorikozmetik.com/sifre-yenile')
    expect(response.cookies.set).toHaveBeenCalledWith(RECOVERY_COOKIE, recoverySessionProof(session.access_token), expect.objectContaining({ httpOnly: true, secure: true, maxAge: 600 }))
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
  it('rejects expired codes and clears prior recovery permission', async () => {
    mockAuth.exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: { message: 'expired' } })
    const response = await GET(request('?code=expired')) as any
    expect(response.url).toContain('error=invalid_link')
    expect(response.cookies.set).toHaveBeenCalledWith(RECOVERY_COOKIE, '', expect.objectContaining({ maxAge: 0 }))
  })
  it('supports token-hash recovery only after OTP verification succeeds', async () => {
    mockAuth.verifyOtp.mockResolvedValue({ data: { session, user }, error: null })
    const response = await GET(request('?token_hash=one-time-hash&type=recovery')) as any
    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'one-time-hash', type: 'recovery' })
    expect(response.url).toBe('https://favorikozmetik.com/sifre-yenile')
  })
  it('does not treat an explicit auth error as a successful existing login', async () => {
    const response = await GET(request('?error=access_denied&error_code=otp_expired')) as any
    expect(response.url).toContain('error=invalid_link')
    expect(mockAuth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
  it('sends hash-only links to the browser handler without exchanging a missing code', async () => {
    const response = await GET(request()) as any
    expect(response.url).toBe('https://favorikozmetik.com/auth/dogrulama')
    expect(mockAuth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
  it('blocks cross-origin submissions before accepting any tokens', async () => {
    const response = await POST(request('', { type: 'recovery', access_token: 'a', refresh_token: 'b' }, 'https://other.example')) as any
    expect(response.status).toBe(403)
    expect(mockAuth.setSession).not.toHaveBeenCalled()
  })
  it('rejects non-email token types', async () => {
    const response = await POST(request('', { type: 'invite', access_token: 'a', refresh_token: 'b' })) as any
    expect(response.status).toBe(400)
    expect(mockAuth.setSession).not.toHaveBeenCalled()
  })
  it.each(['signup', 'recovery'])('verifies an already-issued %s implicit link with Supabase', async type => {
    mockAuth.setSession.mockResolvedValue({ data: { session }, error: null })
    mockAuth.getUser.mockResolvedValue({ data: { user }, error: null })
    const response = await POST(request('', { type, access_token: 'a', refresh_token: 'b' })) as any
    expect(response.body).toEqual({ success: true, recovery: type === 'recovery' })
    expect(mockAuth.getUser).toHaveBeenCalled()
  })
  it('does not accept a failed session despite an existing verified login', async () => {
    mockAuth.setSession.mockResolvedValue({ data: { session: null }, error: { message: 'invalid' } })
    mockAuth.getUser.mockResolvedValue({ data: { user }, error: null })
    const response = await POST(request('', { type: 'recovery', access_token: 'bad', refresh_token: 'bad' })) as any
    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })
})
