import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { hasCronAuthorization } from '@/lib/payment-webhook'
import { resolveVerifiedOrderPayment } from '@/lib/payment-verification'
import { reconcileVerifiedPayment } from '@/lib/payment-reconciliation'
import { processVerifiedPaymentOrder } from '@/lib/payment-postprocessing'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: NextRequest) {
  if (!hasCronAuthorization(request.headers.get('authorization'), process.env.CRON_SECRET)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const db = createSupabaseAdmin()
    const { data, error } = await db.rpc('claim_payment_checks', { p_limit: 5 })
    if (error) throw new Error('payment_claim_failed')
    let reconciled = 0
    const outcomes = await Promise.allSettled((data || []).map(async (order: any) => {
      const outcome = await resolveVerifiedOrderPayment(order, { conversationId: order.payment_token, paymentId: order.iyzico_payment_id })
      if (outcome.status === 'verified' && outcome.result) {
        await reconcileVerifiedPayment(db, order, outcome.result); reconciled++
        await processVerifiedPaymentOrder(db, { paymentToken: order.payment_token, orderNumber: order.order_number })
      }
    }))
    return NextResponse.json({ checked: outcomes.length, reconciled, errors: outcomes.filter(x => x.status === 'rejected').length })
  } catch { return NextResponse.json({ error: 'Payment reconciliation unavailable' }, { status: 503 }) }
}
