import { NextRequest, NextResponse } from 'next/server'
import { complete3DSPayment } from '@/lib/iyzico'
import { createSupabaseServer } from '@/lib/supabase/server'

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
      hasConversationIdFromForm: !!conversationIdFromForm,
      hasConversationIdFromGoreq: !!conversationIdFromGoreq,
      mdStatus: mdStatus || '-',
      formKeys: Object.keys(formObj),
      queryKeys: Array.from(params.keys()),
    })

    // Bazı banka/3DS dönüşlerinde paymentId/conversationData gelmeyebilir.
    // Elimizde conversationId varsa status endpoint üzerinden doğrulamaya devam et.
    if (!paymentId || !conversationData) {
      if (conversationId) {
        const qs = new URLSearchParams({
          token: conversationId,
        })
        return NextResponse.redirect(`${baseUrl}/payment/callback?${qs.toString()}`, { status: 302 })
      }
      return NextResponse.redirect(`${baseUrl}/payment/callback?status=failed&error=missing_3ds_payload`, {
        status: 302,
      })
    }

    // mdStatus 1/2/3/4 başarılı kabul edilir
    if (mdStatus && !['1', '2', '3', '4'].includes(mdStatus)) {
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

    return NextResponse.redirect(`${baseUrl}/payment/callback?${qs.toString()}`, { status: 302 })
  } catch (e: any) {
    return NextResponse.redirect(
      `${baseUrl}/payment/callback?status=failed&error=${encodeURIComponent(e?.message || '3ds_callback_get_error')}`,
      { status: 302 }
    )
  }
}

