import { NextRequest, NextResponse } from 'next/server'
import { resolveVerifiedOrderPayment } from '@/lib/payment-verification'
import { markOrderPaymentFailed } from '@/lib/iyzico-payment-amount'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { processVerifiedPaymentOrder } from '@/lib/payment-postprocessing'
import { sendPurchaseOnce } from '@/lib/analytics/meta-capi'
import { reconcileVerifiedPayment } from '@/lib/payment-reconciliation'
import { adItemsFromOrder, adValueFromOrder, AD_CURRENCY } from '@/lib/analytics/value'
import { kurusToTl } from '@/lib/price'

export const dynamic = 'force-dynamic'

function hasPaymentVerification(order: { iyzico_payment_id?: unknown; payment_verified_at?: unknown }): boolean {
  return typeof order.iyzico_payment_id === 'string' && /^\d{1,32}$/.test(order.iyzico_payment_id) &&
    typeof order.payment_verified_at === 'string' && Number.isFinite(Date.parse(order.payment_verified_at))
}

function getOrdersSupabase() {
  try {
    return createSupabaseAdmin()
  } catch (e) {
    console.error('[payment/status] SUPABASE_SERVICE_ROLE_KEY eksik — sipariş/3DS tamamlama RLS yüzünden kırılabilir', e)
    return null
  }
}

async function buildPurchaseAnalytics(
  supabase: { from: (t: string) => any; rpc: (name: string, args: Record<string, unknown>) => any },
  orderNumber: string | null,
  paymentToken: string | null
) {
  try {
    let q = supabase
      .from('orders')
      .select(
        'id, order_number, items, shipping_cost, total, discount_amount, customer_email, customer_phone, payment_status, status, tracking, iyzico_payment_id, payment_verified_at'
      )
    if (!paymentToken) return null
    q = q.eq('payment_token', paymentToken)
    if (orderNumber) q = q.eq('order_number', orderNumber)
    const { data, error: lookupError } = await q.maybeSingle()
    if (lookupError || !data?.id || !data.order_number || data.payment_status !== 'completed' || ['cancelled', 'refunded'].includes(data.status) || !hasPaymentVerification(data)) return null
    // Only the service-only SQL contract can attest private-ledger eligibility.
    // Truthy values, malformed RPC replies and unavailable schemas fail closed.
    const { data: eligible, error } = await supabase.rpc('is_verified_purchase', {
      p_order_id: data.id, p_event_id: data.order_number,
    })
    if (error || eligible !== true) return null
    const storedConsent = data.tracking?.consent
    const consent = {
      ad_storage: storedConsent?.marketing === true ? 'granted' : 'denied',
      analytics_storage: storedConsent?.analytics === true ? 'granted' : 'denied',
      ad_user_data: storedConsent?.marketing === true ? 'granted' : 'denied',
      ad_personalization: storedConsent?.marketing === true ? 'granted' : 'denied',
    }
    const advertisingGranted = consent.ad_storage === 'granted' && consent.ad_user_data === 'granted'
    const value = adValueFromOrder({
      items: data.items,
      shipping_cost: Number(data.shipping_cost) || 0,
      total: data.total,
      discount_amount: data.discount_amount,
    })
    const contents = adItemsFromOrder({ items: data.items })
    return {
      purchase_eligible: true as const,
      order_number: data.order_number as string,
      event_id: data.order_number as string,
      consent,
      value,
      currency: AD_CURRENCY,
      contents,
      shipping: kurusToTl(Number(data.shipping_cost) || 0),
      email: advertisingGranted ? data.customer_email || undefined : undefined,
      phone: advertisingGranted ? data.customer_phone || undefined : undefined,
    }
  } catch {
    return null
  }
}

/**
 * GET /api/payment/status?token=...&orderNumber=...
 * Callback sayfasından çağrılır. Token = Iyzico conversationId.
 * (Callback sayfası "token" veya "conversationId" ile çağırır.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token') || searchParams.get('conversationId')
    const orderNumber = searchParams.get('orderNumber')
    const paymentId = searchParams.get('paymentId')

    // Debug: sunucu loglarında görünür (Vercel Logs veya npm run dev terminali)
    console.log('[payment/status] İstek alındı', {
      hasToken: !!token,
      hasPaymentId: !!paymentId,
      tokenPrefix: token ? `${token.slice(0, 8)}...` : '-',
      orderNumber: orderNumber || '-',
    })

    if (!token || token.startsWith('test-token-')) {
      return NextResponse.json({ success: false, status: 'failed', error: 'Geçersiz ödeme tokeni' }, { status: 400 })
    }

    const ordersDb = getOrdersSupabase()
    if (!ordersDb) {
      return NextResponse.json({ success: false, status: 'pending', error: 'Sipariş altyapısı yapılandırılmamış' }, { status: 503 })
    }
    let orderQuery = ordersDb.from('orders').select('*').eq('payment_token', token)
    if (orderNumber) orderQuery = orderQuery.eq('order_number', orderNumber)
    const { data: canonicalOrder, error: lookupError } = await orderQuery.maybeSingle()
    if (lookupError) throw new Error('Sipariş sorgulanamadı')
    if (!canonicalOrder) {
      return NextResponse.json({ success: false, status: 'failed', error: 'Sipariş bulunamadı' }, { status: 404 })
    }
    if (['cancelled', 'refunded'].includes(canonicalOrder.status) || canonicalOrder.payment_status === 'refunded') {
      return NextResponse.json({ success: false, status: 'failed', error: 'Sipariş iptal edilmiş veya iade edilmiş' }, { status: 409 })
    }

    // Preserve historical paid UI state without inventing verification or replaying effects.
    if (canonicalOrder.payment_status === 'completed') {
      if (!hasPaymentVerification(canonicalOrder)) {
        return NextResponse.json({ success: true, status: 'success', message: 'Payment already completed', purchase_eligible: false, analytics: null })
      }
      const analytics = await buildPurchaseAnalytics(ordersDb, canonicalOrder.order_number, token)
      if (analytics) {
        await processVerifiedPaymentOrder(ordersDb, { orderNumber: canonicalOrder.order_number, paymentToken: token })
        await sendPurchaseOnce(canonicalOrder.order_number)
      }
      return NextResponse.json({
        success: true,
        status: 'success',
        message: 'Payment already completed',
        purchase_eligible: analytics?.purchase_eligible === true,
        analytics,
      })
    }

    const verification = await resolveVerifiedOrderPayment(canonicalOrder, { conversationId: token, paymentId })
    if (verification.status === 'unknown') {
      return NextResponse.json({ success: false, status: 'pending', error: 'Ödeme sonucu kontrol ediliyor. Lütfen yeniden ödeme yapmadan sonucu bekleyin.' })
    }
    if (verification.status === 'failed') {
      await markOrderPaymentFailed(ordersDb, { paymentToken: token, orderNumber: canonicalOrder.order_number })
      // A webhook may have confirmed payment since the initial read. Never show a stale failure.
      const { data: current, error } = await ordersDb.from('orders').select('payment_status, status')
        .eq('payment_token', token).eq('order_number', canonicalOrder.order_number).maybeSingle()
      if (error || !current) return NextResponse.json({ success: false, status: 'pending' })
      if (current.payment_status === 'completed' && !['cancelled', 'refunded'].includes(current.status)) {
        const analytics = await buildPurchaseAnalytics(ordersDb, canonicalOrder.order_number, token)
        return NextResponse.json({ success: true, status: 'success', purchase_eligible: analytics?.purchase_eligible === true, analytics })
      }
      if (current.payment_status !== 'failed') return NextResponse.json({ success: false, status: 'pending' })
      return NextResponse.json({ success: false, status: 'failed', error: 'Banka ödeme işleminin başarısız olduğunu doğruladı.' })
    }

    // The database transaction marks paid and creates the durable outbox record together.
    if (verification.status !== 'verified' || !verification.result) {
      return NextResponse.json({ success: false, status: 'pending' })
    }
    const paidOrder = await reconcileVerifiedPayment(ordersDb, canonicalOrder, verification.result)
    if (['cancelled', 'refunded'].includes(paidOrder.status) || paidOrder.payment_status === 'refunded') {
      return NextResponse.json({ success: false, status: 'failed', error: 'Sipariş iptal edilmiş veya iade edilmiş' }, { status: 409 })
    }
    if (!hasPaymentVerification(paidOrder)) throw new Error('payment_verification_record_missing')
    await processVerifiedPaymentOrder(ordersDb, { orderNumber: paidOrder.order_number, paymentToken: paidOrder.payment_token })

    const analytics = await buildPurchaseAnalytics(
      ordersDb,
      paidOrder.order_number,
      paidOrder.payment_token
    )

    return NextResponse.json({ success: true, status: 'success', purchase_eligible: analytics?.purchase_eligible === true, analytics })
  } catch (error: any) {
    console.error('Payment status error:', error)
    return NextResponse.json(
      { success: false, status: 'pending', error: 'Ödeme sonucu şu anda doğrulanamıyor. Lütfen yeniden ödeme yapmadan bekleyin.' },
      { status: 500 }
    )
  }
}
