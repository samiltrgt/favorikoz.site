import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { drainTrackingOutbox } from '@/lib/tracking/outbox'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.get('authorization') || ''
  const expected = `Bearer ${secret || ''}`
  const left = Buffer.from(supplied); const right = Buffer.from(expected)
  if (!secret || left.length !== right.length || !timingSafeEqual(left, right)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { return NextResponse.json(await drainTrackingOutbox({ limit: 10 })) }
  catch { return NextResponse.json({ error: 'Tracking delivery unavailable' }, { status: 503 }) }
}
