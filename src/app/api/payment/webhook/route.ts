import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { verifyIyzicoWebhook } from '@/lib/payment-webhook'
import { resolveVerifiedOrderPayment } from '@/lib/payment-verification'
import { reconcileVerifiedPayment } from '@/lib/payment-reconciliation'
import { processVerifiedPaymentOrder } from '@/lib/payment-postprocessing'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  if (!process.env.IYZICO_SECRET_KEY) return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  let body: unknown
  try {
    const text = await request.text()
    if (text.length > 16384) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    body = JSON.parse(text)
  } catch { return NextResponse.json({ error: 'Invalid payload' }, { status: 400 }) }
  if (!verifyIyzicoWebhook(body, request.headers.get('x-iyz-signature-v3'), process.env.IYZICO_SECRET_KEY?.trim())) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
  try {
    const db = createSupabaseAdmin()
    const { data: order, error } = await db.from('orders').select('*').eq('payment_token', body.paymentConversationId).maybeSingle()
    if (error) throw new Error('order_lookup_failed')
    if (!order || order.payment_status === 'refunded' || order.status === 'refunded') return NextResponse.json({ received: true })
    const outcome = await resolveVerifiedOrderPayment(order, { conversationId: order.payment_token, paymentId: String(body.paymentId) })
    if (outcome.status === 'verified' && outcome.result) {
      if (String(outcome.result.paymentId) !== String(body.paymentId)) return NextResponse.json({ error: 'Payment mismatch' }, { status: 409 })
      await reconcileVerifiedPayment(db, order, outcome.result)
      await processVerifiedPaymentOrder(db, { paymentToken: order.payment_token, orderNumber: order.order_number })
      return NextResponse.json({ received: true, reconciled: true })
    }
    // Negative/unknown notifications never cancel orders. Authoritative cron retries independently.
    return NextResponse.json({ received: true, reconciled: false }, { status: outcome.status === 'unknown' ? 503 : 200 })
  } catch { return NextResponse.json({ error: 'Payment verification unavailable' }, { status: 503 }) }
}
