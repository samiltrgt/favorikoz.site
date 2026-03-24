import { NextRequest, NextResponse } from 'next/server'
import { retrievePayment, retrievePaymentByPaymentId } from '@/lib/iyzico'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createEArchiveInvoice, isNesConfigured } from '@/lib/nes'

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

    if (!token && !paymentId) {
      return NextResponse.json({ success: false, status: 'failed', error: 'Missing token/paymentId' }, { status: 400 })
    }

    // Önce DB'de zaten completed ise direkt başarılı dön
    try {
      const supabase = await createSupabaseServer()
      const { data: existing } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('payment_token', token)
        .single()
      if (existing?.payment_status === 'completed') {
        return NextResponse.json({ success: true, status: 'success', message: 'Payment already completed' })
      }
    } catch {}

    if (token?.startsWith('test-token-')) {
      if (orderNumber) {
        try {
          const supabase = await createSupabaseServer()
          await supabase
            .from('orders')
            .update({ status: 'paid', payment_status: 'completed', payment_token: token })
            .eq('order_number', orderNumber)
          await tryCreateNesInvoice(supabase, orderNumber, token)
        } catch {}
      }
      return NextResponse.json({ success: true, status: 'success', message: 'Test payment' })
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    const result = token ? await retrievePayment(token) : await retrievePaymentByPaymentId(paymentId as string)
    let finalResult =
      paymentId && result.status === 'success' && result.paymentStatus === 'CALLBACK_THREEDS'
        ? await retrievePaymentByPaymentId(paymentId)
        : result

    // 3DS callback sonrasında bankanın provizyon sonucu birkaç saniye gecikebilir.
    // Bu yüzden kısa bir sunucu tarafı yeniden deneme penceresi uyguluyoruz.
    if (finalResult.status === 'success' && finalResult.paymentStatus === 'CALLBACK_THREEDS') {
      for (let i = 0; i < 5; i += 1) {
        await sleep(1500)
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
      if (finalResult.status === 'success' && finalResult.paymentStatus === 'CALLBACK_THREEDS') {
        return NextResponse.json({
          success: false,
          status: 'pending',
          error: '3D doğrulama tamamlandı, banka provizyon onayı bekleniyor',
        })
      }
      return NextResponse.json({
        success: false,
        status: 'failed',
        error:
          finalResult.paymentStatus && finalResult.paymentStatus !== 'SUCCESS'
            ? `Ödeme henüz tamamlanmadı (${finalResult.paymentStatus})`
            : (finalResult.errorMessage || 'Ödeme başarısız veya bulunamadı'),
      })
    }

    const supabase = await createSupabaseServer()
    let query = supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'completed',
        payment_token: token,
      })
      .eq('payment_status', 'pending')

    if (orderNumber) {
      query = query.eq('order_number', orderNumber)
    } else {
      query = query.eq('payment_token', token as string)
    }
    const { error } = await query
    if (error) console.error('[payment/status] Order update error:', error)
    else console.log('[payment/status] Sipariş güncellendi (ödendi)', orderNumber || '(token ile bulundu)')

    await tryCreateNesInvoice(supabase, orderNumber || null, token || '')

    return NextResponse.json({ success: true, status: 'success' })
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
