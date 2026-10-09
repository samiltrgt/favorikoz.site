import ResetPasswordPage from '@/app/(auth)/sifre-yenile/page'
import { RECOVERY_COOKIE, recoverySessionProof } from '@/lib/auth-email'

jest.mock('server-only', () => ({}))
const mockCookie = jest.fn()
const mockAuth = { getUser: jest.fn(), getSession: jest.fn() }
jest.mock('next/headers', () => ({ cookies: () => ({ get: mockCookie }) }))
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServer: jest.fn(() => ({ auth: mockAuth })) }))
jest.mock('@/components/reset-password-form', () => () => null)
const token = 'verified-current-token'
describe('server-side password recovery permission', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'customer' } }, error: null })
    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: token } } })
  })
  it('rejects an ordinary authenticated session without a recovery cookie', async () => {
    mockCookie.mockReturnValue(undefined)
    const page = await ResetPasswordPage({ searchParams: {} })
    expect(page.props.recoveryAuthorized).toBe(false)
    expect(mockAuth.getSession).not.toHaveBeenCalled()
  })
  it('authorizes the exact verified recovery session on a reload', async () => {
    mockCookie.mockReturnValue({ value: recoverySessionProof(token) })
    const page = await ResetPasswordPage({ searchParams: {} })
    expect(mockCookie).toHaveBeenCalledWith(RECOVERY_COOKIE)
    expect(page.props.recoveryAuthorized).toBe(true)
  })
  it('rejects a recovery cookie belonging to a different session', async () => {
    mockCookie.mockReturnValue({ value: recoverySessionProof('old-session') })
    expect((await ResetPasswordPage({ searchParams: {} })).props.recoveryAuthorized).toBe(false)
  })
  it('rejects a session that Supabase cannot verify', async () => {
    mockCookie.mockReturnValue({ value: recoverySessionProof(token) })
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'revoked' } })
    expect((await ResetPasswordPage({ searchParams: {} })).props.recoveryAuthorized).toBe(false)
    expect(mockAuth.getSession).not.toHaveBeenCalled()
  })
})
