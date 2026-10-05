import { NextRequest, NextResponse } from 'next/server'
import { complete3DSPaymentV2, retrievePayment, retrievePaymentByPaymentId } from '@/lib/iyzico'
import { buildIyzicoPaidPriceFromOrder, markOrderPaymentFailed, matchesIyzicoOrderPayment } from '@/lib/iyzico-payment-amount'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import { createEArchiveInvoice, isNesConfigured } from '@/lib/nes'
import { trySendOrderConfirmationEmail } from '@/lib/order-email'
import { sendPurchaseOnce } from '@/lib/analytics/meta-capi'
import { confirmOrderPayment } from '@/lib/tracking/payment'
import { adItemsFromOrder, adValueFromOrder, AD_CURRENCY } from '@/lib/analytics/value'
import { kurusToTl } from '@/lib/price'

export const dynamic = 'force-dynamic'

function getOrdersSupabase() {
  try {
    return createSupabaseAdmin()
  } catch (e) {
    console.error('[payment/status] SUPABASE_SERVICE_ROLE_KEY eksik — sipariş/3DS tamamlama RLS yüzünden kırılabilir', e)
    return null
  }
}

async function buildPurchaseAnalytics(
  supabase: { from: (t: string) => any },
  orderNumber: string | null,
  paymentToken: string | null
) {
  try {
    let q = supabase
      .from('orders')
      .select(
        'order_number, items, shipping_cost, total, discount_amount, customer_email, customer_phone, payment_status, status, tracking'
      )
    if (!paymentToken) return null
    q = q.eq('payment_token', paymentToken)
    if (orderNumber) q = q.eq('order_number', orderNumber)
    const { data } = await q.maybeSingle()
    if (!data?.order_number || data.payment_status !== 'completed' || data.status === 'cancelled') return null
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
      return NextResponse.json({ success: false, status: 'failed', error: 'Sipariş altyapısı yapılandırılmamış' }, { status: 503 })
    }
    let orderQuery = ordersDb.from('orders').select('*').eq('payment_token', token)
    if (orderNumber) orderQuery = orderQuery.eq('order_number', orderNumber)
    const { data: canonicalOrder, error: lookupError } = await orderQuery.maybeSingle()
    if (lookupError) throw new Error('Sipariş sorgulanamadı')
    if (!canonicalOrder) {
      return NextResponse.json({ success: false, status: 'failed', error: 'Sipariş bulunamadı' }, { status: 404 })
    }
    if (canonicalOrder.status === 'cancelled' || canonicalOrder.payment_status === 'refunded') {
      return NextResponse.json({ success: false, status: 'failed', error: 'Sipariş iptal edilmiş veya iade edilmiş' }, { status: 409 })
    }

    // Önce DB'de zaten completed ise direkt başarılı dön
    if (canonicalOrder.payment_status === 'completed') {
      await trySendOrderConfirmationEmail(ordersDb, {
        orderNumber: canonicalOrder.order_number,
        paymentToken: token,
      })
      const analytics = await buildPurchaseAnalytics(ordersDb, canonicalOrder.order_number, token)
      await sendPurchaseOnce(canonicalOrder.order_number)
      return NextResponse.json({
        success: true,
        status: 'success',
        message: 'Payment already completed',
        analytics,
      })
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    const result = await retrievePayment(token)
    let finalResult =
      paymentId && result.status === 'success' && result.paymentStatus === 'CALLBACK_THREEDS'
        ? await retrievePaymentByPaymentId(paymentId)
        : result

    // CALLBACK_THREEDS: önce v2 tamamlamayı dene (3ds-callback'ta RLS yüzünden atlanmış olabilir)
    if (finalResult.status === 'success' && finalResult.paymentStatus === 'CALLBACK_THREEDS' && token && paymentId) {
      const ordersDb = getOrdersSupabase()
      if (ordersDb) {
        const { data: orderRow } = await ordersDb
          .from('orders')
          .select('iyzico_basket_id, items, shipping_cost, total, discount_amount')
          .eq('payment_token', token)
          .maybeSingle()
        if (orderRow?.iyzico_basket_id) {
          const paidPrice = buildIyzicoPaidPriceFromOrder({
            items: orderRow.items,
            shipping_cost: orderRow.shipping_cost ?? 0,
            total: orderRow.total,
            discount_amount: orderRow.discount_amount,
          })
          console.log('[payment/status] CALLBACK_THREEDS → 3DS v2 auth denemesi', { paymentId, paidPrice })
          try {
            const authResult = await complete3DSPaymentV2({
              conversationId: token,
              paymentId,
              paidPrice,
              basketId: orderRow.iyzico_basket_id,
            })
            if (authResult?.status === 'success' && authResult?.paymentStatus === 'SUCCESS') {
              finalResult = authResult
            }
          } catch (e: any) {
            console.error('[payment/status] 3DS v2 auth hata:', e?.message || e)
          }
        }
      }
    }

    // Hâlâ bekliyorsa kısa retrieve tekrarı (Vercel süre limiti için kısa tutuldu)
    if (finalResult.status === 'success' && finalResult.paymentStatus === 'CALLBACK_THREEDS') {
      for (let i = 0; i < 3; i += 1) {
        await sleep(1000)
        finalResult = paymentId ? await retrievePaymentByPaymentId(paymentId) : await retrievePayment(token as string)
        if (finalResult.status === 'success' && finalResult.paymentStatus === 'SUCCESS') {
          break
        }
      }
    }
    console.log('[payment/status] Iyzico sonucu', {
      status: finalResult.status,
      paymentStatus: finalResult.paymentStatus || '-',
      errorMessage: finalResult.errorMessage || '-',
    })

    // Yalnizca gerçek ödeme tamamlandıysa siparişi "paid" yap.
    // 3DS dönüş durumları (örn: CALLBACK_THREEDS / INIT_THREEDS) henüz final değildir.
    if (finalResult.status !== 'success' || finalResult.paymentStatus !== 'SUCCESS') {
      if (finalResult.paymentStatus !== 'FAILURE') {
        return NextResponse.json({
          success: false,
          status: 'pending',
          error: 'Banka ödeme onayı bekleniyor. Ödeme sonucu yeniden sorgulanabilir.',
        })
      }
      const ordersDb = getOrdersSupabase()
      if (ordersDb) {
        await markOrderPaymentFailed(ordersDb, {
          paymentToken: token,
          orderNumber: orderNumber || null,
        })
      }
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: finalResult.errorMessage || `Ödeme başarısız (${finalResult.paymentStatus})`,
      })
    }

    if (!matchesIyzicoOrderPayment(canonicalOrder, finalResult)) {
      return NextResponse.json({ success: false, status: 'failed', error: 'Ödeme tutarı veya sepet kimliği doğrulanamadı' }, { status: 409 })
    }

    // The database transaction marks paid and creates the durable outbox record together.
    const paidOrder = await confirmOrderPayment(ordersDb, { paymentToken: token, orderNumber: canonicalOrder.order_number })
    await recordCouponUsage(ordersDb, paidOrder.order_number, token)
    await tryCreateNesInvoice(ordersDb, paidOrder.order_number, token)
    await trySendOrderConfirmationEmail(ordersDb, {
      orderNumber: paidOrder.order_number,
      paymentToken: token,
    })
    await sendPurchaseOnce(paidOrder.order_number)

    const analytics = await buildPurchaseAnalytics(
      ordersDb,
      paidOrder.order_number,
      token
    )

    return NextResponse.json({ success: true, status: 'success', analytics })
  } catch (error: any) {
    console.error('Payment status error:', error)
    return NextResponse.json(
      { success: false, status: 'failed', error: error?.message || 'Sorgu hatası' },
      { status: 500 }
    )
  }
}

async function tryCreateNesInvoice(supabase: Awaited<ReturnType<typeof createSupabaseServer>>, orderNumber: string | null, paymentToken: string) {
  if (!isNesConfigured()) {
    console.warn('[payment/status] NES fatura atlandı: NES yapılandırılmamış (NES_API_BASE_URL, NES_API_KEY, NES_MARKETPLACE_ID)')
    return
  }
  try {
    let orderRow: any = null
    if (orderNumber) {
      const { data } = await supabase.from('orders').select('*').eq('order_number', orderNumber).eq('status', 'paid').single()
      orderRow = data
    } else {
      const { data } = await supabase.from('orders').select('*').eq('payment_token', paymentToken).eq('status', 'paid').single()
      orderRow = data
    }
    if (!orderRow || orderRow.invoice_uuid) {
      if (orderRow?.invoice_uuid) console.log('[payment/status] NES fatura zaten mevcut:', orderRow.order_number)
      return
    }
    console.log('[payment/status] NES fatura oluşturuluyor:', orderRow.order_number)
    const shipping = (orderRow.shipping_address as { address?: string; city?: string; zipcode?: string }) || {}
    const items = (orderRow.items as Array<{ name: string; price: number; quantity: number }>) || []
    const invoiceResult = await createEArchiveInvoice({
      id: orderRow.id,
      order_number: orderRow.order_number,
      customer_name: orderRow.customer_name,
      customer_email: orderRow.customer_email,
      customer_phone: orderRow.customer_phone,
      customer_tc: orderRow.customer_tc,
      shipping_address: shipping,
      items,
      subtotal: orderRow.subtotal,
      shipping_cost: orderRow.shipping_cost,
      total: orderRow.total,
      created_at: orderRow.created_at,
    })
    if (invoiceResult.success) {
      await supabase
        .from('orders')
        .update({
          invoice_uuid: invoiceResult.uuid,
          invoice_pdf_url: invoiceResult.pdfUrl || null,
          invoiced_at: new Date().toISOString(),
        })
        .eq('order_number', orderRow.order_number)
      console.log('✅ NES e-arşiv fatura oluşturuldu:', orderRow.order_number, invoiceResult.uuid)
    } else {
      console.warn('NES fatura uyarısı:', orderRow.order_number, invoiceResult.error)
    }
  } catch (err: any) {
    console.error('NES fatura hatası:', err?.message || err)
  }
}

async function recordCouponUsage(supabase: any, orderNumber: string | null, paymentToken: string) {
  try {
    let query = supabase
      .from('orders')
      .select('id, coupon_code, customer_email')
      .eq('status', 'paid')
      .limit(1)

    query = orderNumber ? query.eq('order_number', orderNumber) : query.eq('payment_token', paymentToken)
    const { data: order } = await query.maybeSingle()
    if (!order?.coupon_code) return

    const { data: coupon } = await supabase.from('coupons').select('id').eq('code', order.coupon_code).maybeSingle()
    if (!coupon?.id) return

    await supabase.from('coupon_usages').upsert(
      {
        coupon_id: coupon.id,
        order_id: order.id,
        customer_identity_key: (order.customer_email || '').trim().toLowerCase(),
      },
      { onConflict: 'order_id' }
    )
  } catch (err) {
    console.error('[payment/status] coupon usage kayıt hatası:', err)
  }
}
