import type { SupabaseClient } from '@supabase/supabase-js'

type OrderItem = {
  name?: string
  quantity?: number
  price?: number
}

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
  return (amount / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function buildOrderEmailHtml(order: OrderRow): string {
  const items = (Array.isArray(order.items) ? order.items : []) as OrderItem[]
  const address = (order.shipping_address || {}) as {
    address?: string
    city?: string
    zipcode?: string
  }

  const rows = items
    .map((item) => {
      const qty = item.quantity || 1
      const line = (item.price || 0) * qty
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${item.name || 'Ürün'}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">₺${formatTry(line)}</td>
      </tr>`
    })
    .join('')

  const shippingLabel =
    order.shipping_cost <= 0 ? 'Ücretsiz' : `₺${formatTry(order.shipping_cost)}`

  return `<!DOCTYPE html>
<html lang="tr">
<body style="font-family:Arial,sans-serif;color:#111;line-height:1.5;margin:0;padding:24px;background:#f9fafb;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h1 style="margin:0 0 8px;font-size:22px;">Siparişiniz alındı</h1>
    <p style="margin:0 0 20px;color:#555;">Merhaba ${order.customer_name || 'müşterimiz'}, siparişiniz için teşekkür ederiz.</p>
    <p style="margin:0 0 20px;"><strong>Sipariş no:</strong> ${order.order_number}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr>
          <th style="text-align:left;padding-bottom:8px;border-bottom:2px solid #111;">Ürün</th>
          <th style="text-align:center;padding-bottom:8px;border-bottom:2px solid #111;">Adet</th>
          <th style="text-align:right;padding-bottom:8px;border-bottom:2px solid #111;">Tutar</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:8px 0;"><strong>Ara toplam:</strong> ₺${formatTry(order.subtotal)}</p>
    <p style="margin:8px 0;"><strong>Kargo:</strong> ${shippingLabel}</p>
    <p style="margin:8px 0 20px;font-size:18px;"><strong>Toplam:</strong> ₺${formatTry(order.total)}</p>
    <p style="margin:0 0 8px;"><strong>Teslimat adresi</strong></p>
    <p style="margin:0 0 20px;color:#555;">
      ${address.address || '-'}<br />
      ${address.city || ''} ${address.zipcode || ''}
    </p>
    <p style="margin:0;color:#777;font-size:13px;">Favori Kozmetik</p>
  </div>
</body>
</html>`
}

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.warn('[order-email] RESEND_API_KEY tanımlı değil — müşteri maili atlanıyor')
    return
  }

  const from =
    process.env.ORDER_FROM_EMAIL?.trim() || 'Favori Kozmetik <onboarding@resend.dev>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend hatası (${res.status}): ${body}`)
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

    const subject = `Siparişiniz alındı — ${order.order_number}`
    const html = buildOrderEmailHtml(order)
    await sendViaResend(to, subject, html)
    console.log('[order-email] Müşteri maili gönderildi:', order.order_number, to)
  } catch (error: any) {
    console.error('[order-email] Gönderim hatası:', error?.message || error)
  }
}
