import { NextRequest, NextResponse } from 'next/server'
import { complete3DSPayment } from '@/lib/iyzico'
import { createSupabaseServer } from '@/lib/supabase/server'

function getBaseUrl(req: NextRequest): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (envBase) return envBase.replace(/\/+$/, '')
  const host = req.headers.get('host') || 'localhost:1700'
  return `https://${host}`
}

export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request)
  try {
    const form = await request.formData()
    const paymentId = String(form.get('paymentId') || '')
    const conversationData = String(form.get('conversationData') || '')
    const conversationId = String(form.get('conversationId') || '')
    const mdStatus = String(form.get('mdStatus') || '')

    if (!paymentId || !conversationData || !conversationId) {
      return NextResponse.redirect(
        `${baseUrl}/payment/callback?status=failed&error=missing_3ds_payload`,
        { status: 302 }
      )
    }

    // mdStatus 1/2/3/4 başarılı kabul edilir
    if (!['1', '2', '3', '4'].includes(mdStatus)) {
      return NextResponse.redirect(
        `${baseUrl}/payment/callback?status=failed&token=${encodeURIComponent(conversationId)}&error=mdstatus_${mdStatus || 'unknown'}`,
        { status: 302 }
      )
    }

    const result = await complete3DSPayment({
      conversationId,
      paymentId,
      conversationData,
    })

    const supabase = await createSupabaseServer()
    const { data: order } = await supabase
      .from('orders')
      .select('order_number')
      .eq('payment_token', conversationId)
      .single()

    const orderNumber = order?.order_number || ''

    if (result?.status === 'success') {
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'completed',
          payment_token: conversationId,
        })
        .eq('payment_token', conversationId)

      const qs = new URLSearchParams({
        status: 'success',
        token: conversationId,
      })
      if (orderNumber) qs.set('orderNumber', orderNumber)

      return NextResponse.redirect(`${baseUrl}/payment/callback?${qs.toString()}`, { status: 302 })
    }

    const failed = new URLSearchParams({
      status: 'failed',
      token: conversationId,
      error: result?.errorMessage || '3ds_complete_failed',
    })
    if (orderNumber) failed.set('orderNumber', orderNumber)
    return NextResponse.redirect(`${baseUrl}/payment/callback?${failed.toString()}`, { status: 302 })
  } catch (e: any) {
    return NextResponse.redirect(
      `${baseUrl}/payment/callback?status=failed&error=${encodeURIComponent(e?.message || '3ds_callback_error')}`,
      { status: 302 }
    )
  }
}

