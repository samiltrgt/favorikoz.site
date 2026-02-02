import { NextRequest, NextResponse } from 'next/server'
import { retrievePayment } from '@/lib/iyzico'
import { createSupabaseServer } from '@/lib/supabase/server'

/**
 * GET /api/payment/status?token=...&orderNumber=...
 * Callback sayfasından çağrılır. Token = Iyzico conversationId.
 * Iyzico'dan ödeme sonucunu sorgular; başarılıysa siparişi paid/completed günceller.
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

    try {
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
    } catch (err) {
      console.error('Supabase update error:', err)
    }

    return NextResponse.json({ success: true, status: 'success' })
  } catch (error: any) {
    console.error('Payment status error:', error)
    return NextResponse.json(
      { success: false, status: 'failed', error: error?.message || 'Sorgu hatası' },
      { status: 500 }
    )
  }
}
