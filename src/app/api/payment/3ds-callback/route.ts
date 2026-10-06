export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { complete3DSPayment, complete3DSPaymentV2 } from '@/lib/iyzico'
import { buildIyzicoPaidPriceFromOrder, markOrderPaymentFailed } from '@/lib/iyzico-payment-amount'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { confirmOrderPayment } from '@/lib/tracking/payment'
import { processVerifiedPaymentOrder } from '@/lib/payment-postprocessing'
import { resolveVerifiedOrderPayment } from '@/lib/payment-verification'

function getBaseUrl(req: NextRequest): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (envBase) return envBase.replace(/\/+$/, '')
  const host = req.headers.get('host') || 'localhost:1700'
  return `https://${host}`
}

function pickFirst(obj: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function tryExtractConversationIdFromGoreq(goreq: string): string {
  try {
    const parts = goreq.split('.')
    if (parts.length < 2) return ''
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    const jsonStr = Buffer.from(payload, 'base64').toString('utf-8')
    const json = JSON.parse(jsonStr) as Record<string, any>
    return (
      String(json.conversationId || json.conversation_id || json.paymentConversationId || json.token || '').trim()
    )
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request)
  let supabase: ReturnType<typeof createSupabaseAdmin>
  try {
    supabase = createSupabaseAdmin()
  } catch (e) {
    console.error('[3ds-callback] SUPABASE_SERVICE_ROLE_KEY gerekli (Iyzico POST’ta RLS misafir siparişi okuyamaz)', e)
    return NextResponse.redirect(
      `${baseUrl}/payment/callback?status=pending&error=supabase_service_role_missing`,
      { status: 302 }
    )
  }
  let callbackToken = ''
  let callbackPaymentId = ''
  try {
    const form = await request.formData()
    const params = new URL(request.url).searchParams

    const formObj: Record<string, string> = {}
    form.forEach((value, key) => {
      formObj[key] = typeof value === 'string' ? value : ''
    })

    const paymentId = pickFirst(formObj, ['paymentId', 'paymentid'])
    const conversationData = pickFirst(formObj, ['conversationData', 'conversationdata', 'conversation_data'])
    const conversationIdFromForm = pickFirst(formObj, [
      'conversationId',
      'conversationid',
      'paymentConversationId',
      'paymentconversationid',
      'token',
    ])
    const mdStatus = pickFirst(formObj, ['mdStatus', 'mdstatus'])
    const goreq = pickFirst(formObj, ['goreq'])
    const conversationIdFromGoreq = goreq ? tryExtractConversationIdFromGoreq(goreq) : ''
    const conversationId =
      conversationIdFromForm ||
      params.get('conversationId') ||
      params.get('token') ||
      conversationIdFromGoreq ||
      ''

    console.log('[3ds-callback][POST] incoming payload', {
      hasPaymentId: !!paymentId,
      hasConversationData: !!conversationData,
      conversationDataLength: conversationData ? conversationData.length : 0,
      hasConversationIdFromForm: !!conversationIdFromForm,
      hasConversationIdFromGoreq: !!conversationIdFromGoreq,
      conversationIdPrefix: conversationId ? `${conversationId.slice(0, 8)}...` : '-',
      mdStatus: mdStatus || '-',
      formKeys: Object.keys(formObj),
      queryKeys: Array.from(params.keys()),
    })

    callbackToken = conversationId
    callbackPaymentId = paymentId

    const { data: order } = await supabase
      .from('orders')
      .select('payment_token, order_number, iyzico_basket_id, items, shipping_cost, total, discount_amount, status, payment_status')
      .eq('payment_token', conversationId)
      .maybeSingle()

    const orderNumber = order?.order_number || ''
    if (!order || order.status === 'cancelled' || order.payment_status === 'refunded') {
      return NextResponse.redirect(`${baseUrl}/payment/callback?status=failed&error=order_not_payable`, { status: 302 })
    }
    if (order.payment_status === 'completed') {
      const qs = new URLSearchParams({ token: conversationId, orderNumber })
      return NextResponse.redirect(`${baseUrl}/payment/callback?${qs}`, { status: 302 })
    }

    let result: any = null
    // A browser POST cannot establish failure. Skip auth on negative mdStatus, then retrieve.
    try {
      if (!mdStatus || ['1', '2', '3', '4'].includes(mdStatus)) {
        if (paymentId && conversationData) {
          result = await complete3DSPayment({ conversationId, paymentId, conversationData })
        } else if (paymentId && conversationId && order.iyzico_basket_id) {
          result = await complete3DSPaymentV2({
            conversationId,
            paymentId,
            paidPrice: buildIyzicoPaidPriceFromOrder(order),
            basketId: order.iyzico_basket_id,
          })
        }
      }
    } catch (error) {
      console.error('[3ds-callback] Completion unavailable; retrieving authoritative payment result', error)
    }

    const verification = await resolveVerifiedOrderPayment(order, {
      conversationId,
      paymentId: result?.paymentId || paymentId,
    })
    const qs = new URLSearchParams({ token: conversationId, orderNumber })
    if (paymentId) qs.set('paymentId', paymentId)
    if (verification.status === 'verified') {
      await confirmOrderPayment(supabase, { paymentToken: conversationId, orderNumber })
      await processVerifiedPaymentOrder(supabase, { paymentToken: conversationId, orderNumber })
      qs.set('status', 'success')
    } else if (verification.status === 'failed') {
      await markOrderPaymentFailed(supabase, { paymentToken: conversationId, orderNumber })
      qs.set('status', 'failed')
    } else {
      qs.set('status', 'pending')
    }
    // Browser receives the verified result; background jobs also run postprocessing.
    return NextResponse.redirect(`${baseUrl}/payment/callback?${qs}`, { status: 302 })
  } catch (e: any) {
    return NextResponse.redirect(
      `${baseUrl}/payment/callback?${new URLSearchParams({ status: 'pending', token: callbackToken, ...(callbackPaymentId ? { paymentId: callbackPaymentId } : {}) })}`,
      { status: 302 }
    )
  }
}

// Bazı banka akışları callback'e GET dönebilir.
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request)
  try {
    const params = new URL(request.url).searchParams
    const conversationId =
      params.get('conversationId') ||
      params.get('paymentConversationId') ||
      params.get('token') ||
      ''
    const goreq = params.get('goreq') || ''
    const conversationIdFromGoreq = goreq ? tryExtractConversationIdFromGoreq(goreq) : ''
    const token = (conversationId || conversationIdFromGoreq || '').trim()

    console.log('[3ds-callback][GET] incoming query', {
      hasConversationId: !!conversationId,
      hasConversationIdFromGoreq: !!conversationIdFromGoreq,
      queryKeys: Array.from(params.keys()),
    })

    if (!token) {
      return NextResponse.redirect(`${baseUrl}/payment/callback?status=failed&error=missing_callback_token`, {
        status: 302,
      })
    }

    const qs = new URLSearchParams({ token })
    const orderNumber = params.get('orderNumber')
    if (orderNumber) qs.set('orderNumber', orderNumber)
    const paymentId = params.get('paymentId')
    if (paymentId) qs.set('paymentId', paymentId)

    return NextResponse.redirect(`${baseUrl}/payment/callback?${qs.toString()}`, { status: 302 })
  } catch (e: any) {
    return NextResponse.redirect(
      `${baseUrl}/payment/callback?status=failed&error=${encodeURIComponent(e?.message || '3ds_callback_get_error')}`,
      { status: 302 }
    )
  }
}

