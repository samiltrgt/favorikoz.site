import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { parseBrowserEvent } from '@/lib/tracking/schema'
import { captureOrderTracking } from '@/lib/tracking/identity'
import { buildMetaUserData } from '@/lib/tracking/meta'
import { enqueueBrowserEvent, drainTrackingOutbox } from '@/lib/tracking/outbox'
import { createSupabaseServer } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin
  if (request.headers.get('origin') !== origin || !request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'Invalid request' }, { status: 403 })
  const limiter = checkRateLimit(`tracking:${getClientIp(request)}`, 60, 60000)
  if (!limiter.allowed) return NextResponse.json({ error: 'Too many events' }, { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSec) } })
  try {
    if (Number(request.headers.get('content-length') || 0) > 16384) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    const raw = await request.text()
    if (raw.length > 16384) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    let input: unknown
    try { input = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const event = parseBrowserEvent(input, origin)
    if (!event) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    let verifiedUserId: string | null = null
    if (request.headers.get('cookie')?.includes('sb-')) {
      try {
        const session = await createSupabaseServer()
        const { data: auth, error: authError } = await session.auth.getUser()
        if (!authError) verifiedUserId = auth.user?.id || null
      } catch { /* Guest events remain valid if auth lookup is unavailable. */ }
    }
    const identity = captureOrderTracking(request, event.tracking, verifiedUserId)
    if (!identity.consent.marketing) return new NextResponse(null, { status: 204 })
    const userData = buildMetaUserData(identity)
    if (!Object.keys(userData).length) return new NextResponse(null, { status: 204 })
    await enqueueBrowserEvent({ event_name: event.eventName, event_id: event.eventId, event_time: Math.floor(Date.now() / 1000), action_source: 'website', event_source_url: event.eventSourceUrl, user_data: userData, custom_data: { ...(event.value !== undefined ? { value: event.value } : {}), currency: event.currency, contents: event.contents, content_ids: event.contents.map((row) => row.id), content_type: 'product' } }, identity)
    // Await bounded work on Next 14 so serverless shutdown cannot cut the send off.
    // The accepted event remains durable if immediate delivery fails.
    try { await drainTrackingOutbox({ limit: 10 }) } catch { /* Scheduled worker retries. */ }
    return NextResponse.json({ accepted: true }, { status: 202 })
  } catch { return NextResponse.json({ error: 'Event temporarily unavailable' }, { status: 503 }) }
}
