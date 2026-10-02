import { render } from '@react-email/render'
import { createElement } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import {
  OrderConfirmationEmail,
  type OrderConfirmationItem,
} from '@/emails/order-confirmation'
import { formatTRY, kurusToTl } from '@/lib/price'

type OrderRow = {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  items: unknown
  subtotal: number
  shipping_cost: number
  total: number
  shipping_address: unknown
  payment_status: string
  confirmation_email_sent_at?: string | null
}

function formatTry(amount: number): string {
  return formatTRY(kurusToTl(amount))
}

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.warn('[order-email] RESEND_API_KEY tanımlı değil — müşteri maili atlanıyor')
    return
  }

  const from =
    process.env.ORDER_FROM_EMAIL?.trim() || 'Favori Kozmetik <onboarding@resend.dev>'

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({ from, to, subject, html })

  if (error) {
    throw new Error(`Resend hatası: ${error.message}`)
  }
}

async function fetchOrder(
  supabase: SupabaseClient,
  lookup: { orderNumber?: string | null; paymentToken?: string | null }
): Promise<OrderRow | null> {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('payment_status', 'completed')

  if (lookup.orderNumber) {
    query = query.eq('order_number', lookup.orderNumber)
  } else if (lookup.paymentToken) {
    query = query.eq('payment_token', lookup.paymentToken)
  } else {
    return null
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('[order-email] Sipariş okunamadı:', error.message)
    return null
  }
  return (data as OrderRow | null) ?? null
}

/** Ödeme tamamlandıktan sonra müşterinin checkout'ta yazdığı e-postaya onay gönderir. */
export async function trySendOrderConfirmationEmail(
  supabase: SupabaseClient,
  lookup: { orderNumber?: string | null; paymentToken?: string | null }
): Promise<void> {
  try {
    const order = await fetchOrder(supabase, lookup)
    if (!order) return

    const to = (order.customer_email || '').trim()
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      console.warn('[order-email] Geçersiz müşteri e-postası, atlanıyor:', order.order_number)
      return
    }

    const columnMissing = order.confirmation_email_sent_at === undefined

    if (order.confirmation_email_sent_at) {
      return
    }

    if (!columnMissing) {
      const { data: claimed, error: claimError } = await supabase
        .from('orders')
        .update({ confirmation_email_sent_at: new Date().toISOString() })
        .eq('id', order.id)
        .is('confirmation_email_sent_at', null)
        .select('id')
        .maybeSingle()

      if (claimError) {
        console.error('[order-email] Mail kilidi alınamadı:', claimError.message)
        return
      }

      if (!claimed) return
    } else {
      console.warn(
        '[order-email] confirmation_email_sent_at sütunu yok — mail gönderiliyor (scripts/add-order-email-column.sql çalıştırın)'
      )
    }

    const items = (Array.isArray(order.items) ? order.items : []) as OrderConfirmationItem[]
    const address = (order.shipping_address || {}) as {
      address?: string
      city?: string
      zipcode?: string
    }
    const shippingLabel =
      order.shipping_cost <= 0 ? 'Ücretsiz' : `₺${formatTry(order.shipping_cost)}`

    const subject = `Siparişiniz alındı — ${order.order_number}`
    const html = await render(
      createElement(OrderConfirmationEmail, {
        customerName: order.customer_name,
        orderNumber: order.order_number,
        items,
        subtotalLabel: formatTry(order.subtotal),
        shippingLabel,
        totalLabel: formatTry(order.total),
        addressLine: address.address || '-',
        cityZip: `${address.city || ''} ${address.zipcode || ''}`.trim(),
      })
    )

    await sendViaResend(to, subject, html)
    console.log('[order-email] Müşteri maili gönderildi:', order.order_number, to)
  } catch (error: any) {
    console.error('[order-email] Gönderim hatası:', error?.message || error)
  }
}
