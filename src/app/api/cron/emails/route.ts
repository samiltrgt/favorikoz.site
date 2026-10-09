import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { hasCronAuthorization } from '@/lib/payment-webhook'
import { processEmailNotifications } from '@/lib/email-notifications'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: NextRequest) {
  if (!hasCronAuthorization(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try { return NextResponse.json(await processEmailNotifications(createSupabaseAdmin())) }
  catch { return NextResponse.json({ error: 'Email processing unavailable' }, { status: 503 }) }
}
