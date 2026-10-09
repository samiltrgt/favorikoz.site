import { completeImplicitEmailLink } from '@/lib/auth-email-link'

describe('legacy email link handling', () => {
  beforeEach(() => jest.clearAllMocks())
  it('rejects expired links and ordinary visits without sending anything', async () => {
    expect(await completeImplicitEmailLink('')).toBe('invalid')
    expect(await completeImplicitEmailLink('#error=access_denied&error_code=otp_expired')).toBe('invalid')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('accepts signup only after the server verifies it', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, recovery: false }) })
    expect(await completeImplicitEmailLink('#type=signup&access_token=a&refresh_token=b')).toBe('confirmed')
    expect(fetch).toHaveBeenCalledWith('/auth/callback', expect.objectContaining({ method: 'POST', body: JSON.stringify({ type: 'signup', access_token: 'a', refresh_token: 'b' }) }))
  })
  it('preserves token-hash recovery links', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, recovery: true }) })
    expect(await completeImplicitEmailLink('#type=recovery&token_hash=one-time-hash')).toBe('recovery')
    expect(fetch).toHaveBeenCalledWith('/auth/callback', expect.objectContaining({ body: JSON.stringify({ type: 'recovery', token_hash: 'one-time-hash' }) }))
  })
  it('does not grant recovery when the backend rejects a token', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ success: false }) })
    expect(await completeImplicitEmailLink('#type=recovery&access_token=bad&refresh_token=bad')).toBe('invalid')
  })
})
