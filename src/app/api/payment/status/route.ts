import { NextRequest, NextResponse } from 'next/server'
import { retrievePayment } from '@/lib/iyzico'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createEArchiveInvoice, isNesConfigured } from '@/lib/nes'

/**
 * GET /api/payment/status?token=...&orderNumber=...
 * Callback sayfasından çağrılır. Token = Iyzico conversationId.
 * Iyzico'dan ödeme sonucunu sorgular; başarılıysa siparişi paid/completed günceller, NES e-arşiv fatura keser.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const orderNumber = searchParams.get('orderNumber')

    if (!token) {
      return NextResponse.json({ success: false, status: 'failed', error: 'Missing token' }, { status: 400 })
    }

    // Test/mock token (Iyzico yokken)
    if (token.startsWith('test-token-')) {
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

    const result = await retrievePayment(token)

    if (result.status !== 'success') {
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: result.errorMessage || 'Ödeme başarısız veya bulunamadı',
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
      query = query.eq('payment_token', token)
    }
    const { error } = await query
    if (error) console.error('Order update error:', error)

    const targetOrderNumber = orderNumber || null
    await tryCreateNesInvoice(supabase, targetOrderNumber, token)

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
  if (!isNesConfigured()) return
  try {
    let orderRow: any = null
    if (orderNumber) {
      const { data } = await supabase.from('orders').select('*').eq('order_number', orderNumber).eq('status', 'paid').single()
      orderRow = data
    } else {
      const { data } = await supabase.from('orders').select('*').eq('payment_token', paymentToken).eq('status', 'paid').single()
      orderRow = data
    }
    if (!orderRow || orderRow.invoice_uuid) return
    const shipping = (orderRow.shipping_address as { address?: string; city?: string; zipcode?: string }) || {}
    const items = (orderRow.items as Array<{ name: string; price: number; quantity: number }>) || []
    const orderForInvoice = {
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
    }
    const invoiceResult = await createEArchiveInvoice(orderForInvoice)
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
  } catch (err) {
    console.error('NES fatura hatası:', err)
  }
}
