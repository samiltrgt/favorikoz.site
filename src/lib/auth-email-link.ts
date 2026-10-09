// URL fragments belong in the browser. Send them only to our own auth callback.
export async function completeImplicitEmailLink(hash: string): Promise<'confirmed' | 'recovery' | 'invalid'> {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (params.has('error') || params.has('error_code')) return 'invalid'
  const type = params.get('type')
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const tokenHash = params.get('token_hash')
  if (!['signup', 'email', 'recovery'].includes(type || '') || (!tokenHash && (!accessToken || !refreshToken))) return 'invalid'
  try {
    const response = await fetch('/auth/callback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenHash ? { type, token_hash: tokenHash } : { type, access_token: accessToken, refresh_token: refreshToken }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) return 'invalid'
    return result.recovery ? 'recovery' : 'confirmed'
  } catch { return 'invalid' }
}
