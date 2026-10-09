import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'
import { RECOVERY_COOKIE, RECOVERY_MAX_AGE, recoverySessionProof } from '@/lib/auth-email'
import type { Session } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function setRecoveryPermission(response: NextResponse, session: Session | null, recovery: boolean) {
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.set(RECOVERY_COOKIE, recovery && session ? recoverySessionProof(session.access_token) : '', {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    maxAge: recovery && session ? RECOVERY_MAX_AGE : 0,
  })
  return response
}

// PKCE links created by the existing server-side signup and password-reset APIs.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  if (request.nextUrl.searchParams.has('error') || request.nextUrl.searchParams.has('error_code')) {
    return setRecoveryPermission(NextResponse.redirect(`${getSiteUrl()}/auth/dogrulama?error=invalid_link`), null, false)
  }
  if (!code && !tokenHash) {
    // Implicit links carry their tokens in a fragment, which the server cannot read.
    const response = NextResponse.redirect(`${getSiteUrl()}/auth/dogrulama`)
    response.headers.set('Cache-Control', 'no-store')
    return response
  }
  try {
    const supabase = await createSupabaseServer()
    if (!code && !['signup', 'email', 'recovery'].includes(type || '')) throw new Error('Invalid auth link')
    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type as 'signup' | 'email' | 'recovery' })
    if (error || !data.session || !data.user?.email_confirmed_at) throw new Error('Invalid auth link')
    // auth-js returns the recovery purpose saved with the PKCE verifier, rather
    // than trusting a caller-controlled query parameter or an existing login.
    const recovery = code
      ? (data as typeof data & { redirectType?: string }).redirectType === 'PASSWORD_RECOVERY'
      : type === 'recovery'
    const response = NextResponse.redirect(`${getSiteUrl()}${recovery ? '/sifre-yenile' : '/auth/dogrulama'}`)
    return setRecoveryPermission(response, data.session, recovery)
  } catch {
    return setRecoveryPermission(NextResponse.redirect(`${getSiteUrl()}/auth/dogrulama?error=invalid_link`), null, false)
  }
}

// Compatibility for already-issued implicit links. Never log the tokens.
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== getSiteUrl()) {
    return NextResponse.json({ success: false }, { status: 403 })
  }
  try {
    const body = await request.json()
    const hasTokenHash = typeof body.token_hash === 'string' && !!body.token_hash
    const hasSessionTokens = typeof body.access_token === 'string' && typeof body.refresh_token === 'string'
    if (!['signup', 'email', 'recovery'].includes(body.type) || (!hasTokenHash && !hasSessionTokens)) {
      return NextResponse.json({ success: false }, { status: 400 })
    }
    const supabase = await createSupabaseServer()
    const { data, error } = hasTokenHash
      ? await supabase.auth.verifyOtp({ token_hash: body.token_hash, type: body.type })
      : await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token })
    const { data: verified, error: userError } = await supabase.auth.getUser()
    if (error || userError || !data.session || !verified.user?.email_confirmed_at) {
      return setRecoveryPermission(NextResponse.json({ success: false }, { status: 400 }), null, false)
    }
    const recovery = body.type === 'recovery'
    return setRecoveryPermission(NextResponse.json({ success: true, recovery }), data.session, recovery)
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
