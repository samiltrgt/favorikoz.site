import { createEArchiveInvoice, isNesConfigured } from '@/lib/nes'
import { trySendOrderConfirmationEmail } from '@/lib/order-email'
import { sendPurchaseOnce } from '@/lib/analytics/meta-capi'

/** Idempotent post-payment effects only for active paid orders, never historical fulfilment repair. */
export async function processVerifiedPaymentOrder(db: any, input: { paymentToken: string; orderNumber: string }): Promise<void> {
  const { data: order, error } = await db.from('orders').select('status, payment_status')
    .eq('payment_token', input.paymentToken).eq('order_number', input.orderNumber).maybeSingle()
  if (error || !order || order.status !== 'paid' || order.payment_status !== 'completed') return
  await recordCouponUsage(db, input.orderNumber, input.paymentToken)
  await tryCreateNesInvoice(db, input.orderNumber, input.paymentToken)
  await trySendOrderConfirmationEmail(db, input)
  await sendPurchaseOnce(input.orderNumber)
}

async function tryCreateNesInvoice(supabase: any, orderNumber: string | null, paymentToken: string) {
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
    // Callback, webhook and polling can arrive together. Claim before external creation.
    // Keep the claim on ambiguous provider failure; an operator must verify before retrying.
    const { data: claimed, error: claimError } = await supabase.from('orders')
      .update({ invoice_requested_at: new Date().toISOString() })
      .eq('id', orderRow.id).eq('status', 'paid').eq('payment_status', 'completed')
      .is('invoice_uuid', null).is('invoice_requested_at', null).select('id').maybeSingle()
    if (claimError || !claimed) return
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
