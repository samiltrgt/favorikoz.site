import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { consentFromRequest, consentVersionFromRequest, trackingOwnerFromRequest, explicitConsentCookiesValid } from '@/lib/tracking/identity'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'Invalid request' }, { status: 403 })
  const limit = checkRateLimit(`consent:${getClientIp(request)}`, 30, 60000)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const owner = trackingOwnerFromRequest(request), version = consentVersionFromRequest(request)
  if (!owner || !version) return NextResponse.json({ error: 'Missing consent owner' }, { status: 400 })
  if (!explicitConsentCookiesValid(request)) return NextResponse.json({ error: 'Invalid consent preference' }, { status: 400 })
  try {
    if (Number(request.headers.get('content-length') || 0) > 1024) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    const raw = await request.text()
    if (raw.length > 1024) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    try { JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const consent = consentFromRequest(request)
    const { data, error } = await createSupabaseAdmin().rpc('update_tracking_consent', { p_owner_hash: owner, p_version: version, p_analytics: consent.analytics, p_marketing: consent.marketing })
    if (error) return NextResponse.json({ error: 'Consent temporarily unavailable' }, { status: 503 })
    if (data !== true) return NextResponse.json({ error: 'Stale consent preference' }, { status: 409 })
    return NextResponse.json({ synchronized: true })
  } catch { return NextResponse.json({ error: 'Consent temporarily unavailable' }, { status: 503 }) }
}
