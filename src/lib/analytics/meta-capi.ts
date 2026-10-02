/**
 * Meta Conversions API — Purchase yalnızca sunucudan, tek sefer.
 * Dedup: event_id = order_number (tarayıcı eventID ile aynı string).
 *
 * Env:
 *   META_PIXEL_ID
 *   META_CAPI_ACCESS_TOKEN  (NEXT_PUBLIC_ YASAK)
 *   META_TEST_EVENT_CODE    (yalnızca test; üretimde boş)
 */

import { createHash } from 'crypto'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { adItemsFromOrder, adValueFromOrder, AD_CURRENCY } from '@/lib/analytics/value'
import { getSiteUrl } from '@/lib/site-url'
import { devWarn, devLog } from '@/lib/logger'

function sha256Normalize(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function hashEmail(email: string | null | undefined): string | undefined {
  if (!email) return undefined
  const n = email.trim().toLowerCase()
  if (!n) return undefined
  return sha256Normalize(n)
}

/** Sadece rakam, ülke kodu 90, baştaki 0 yok */
function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined
  let digits = phone.replace(/\D/g, '')
  if (!digits) return undefined
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (!digits.startsWith('90')) digits = `90${digits}`
  return sha256Normalize(digits)
}

function hashName(name: string | null | undefined): string | undefined {
  if (!name) return undefined
  const n = name.trim().toLowerCase()
  if (!n) return undefined
  return sha256Normalize(n)
}

function hashCity(city: string | null | undefined): string | undefined {
  if (!city) return undefined
  const n = city.trim().toLowerCase().replace(/\s+/g, '')
  if (!n) return undefined
  return sha256Normalize(n)
}

function hashZip(zip: string | null | undefined): string | undefined {
  if (!zip) return undefined
  const n = String(zip).trim().toLowerCase().replace(/\s+/g, '')
  if (!n) return undefined
  return sha256Normalize(n)
}

function splitName(full: string | null | undefined): { fn?: string; ln?: string } {
  if (!full) return {}
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return {}
  if (parts.length === 1) return { fn: parts[0] }
  return { fn: parts[0], ln: parts.slice(1).join(' ') }
}

type OrderRow = {
  order_number: string
  payment_status: string
  meta_purchase_sent_at?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  customer_name?: string | null
  user_id?: string | null
  shipping_address?: { city?: string; zipcode?: string; zipCode?: string; address?: string } | null
  items?: unknown
  shipping_cost?: number | null
  total?: number | null
  discount_amount?: number | null
  fbp?: string | null
  fbc?: string | null
  client_ip?: string | null
  client_user_agent?: string | null
}

/**
 * Idempotent Purchase gönderimi.
 * payment_status !== completed → çık
 * meta_purchase_sent_at dolu → çık
 * Önce kilit yaz, sonra CAPI POST
 */
export async function sendPurchaseOnce(orderNumber: string): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID?.trim()
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim()
  if (!pixelId || !accessToken) {
    devWarn('[meta-capi] META_PIXEL_ID veya META_CAPI_ACCESS_TOKEN eksik — Purchase atlandı')
    return
  }

  const supabase = createSupabaseAdmin()

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'order_number, payment_status, meta_purchase_sent_at, customer_email, customer_phone, customer_name, user_id, shipping_address, items, shipping_cost, total, discount_amount, fbp, fbc, client_ip, client_user_agent'
    )
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (error || !order) {
    devWarn('[meta-capi] Sipariş bulunamadı', orderNumber, error)
    return
  }

  const row = order as OrderRow
  if (row.payment_status !== 'completed') return
  if (row.meta_purchase_sent_at) return

  const lockAt = new Date().toISOString()
  const { data: locked, error: lockError } = await supabase
    .from('orders')
    .update({ meta_purchase_sent_at: lockAt })
    .eq('order_number', orderNumber)
    .is('meta_purchase_sent_at', null)
    .eq('payment_status', 'completed')
    .select('order_number')
    .maybeSingle()

  if (lockError || !locked) {
    // Başka süreç kazandı veya kilit başarısız
    return
  }

  try {
    const value = adValueFromOrder({
      items: row.items,
      shipping_cost: Number(row.shipping_cost) || 0,
      total: row.total,
      discount_amount: row.discount_amount,
    })
    const contents = adItemsFromOrder({ items: row.items })
    const contentIds = contents.map((c) => c.id)
    const { fn, ln } = splitName(row.customer_name)
    const city = row.shipping_address?.city
    const zip = row.shipping_address?.zipcode || row.shipping_address?.zipCode

    const externalRaw =
      row.user_id && row.user_id !== 'guest'
        ? String(row.user_id)
        : (row.customer_email || '').trim().toLowerCase()

    const userData: Record<string, string | string[]> = {
      country: [sha256Normalize('tr')],
    }
    const em = hashEmail(row.customer_email)
    const ph = hashPhone(row.customer_phone)
    if (em) userData.em = [em]
    if (ph) userData.ph = [ph]
    const fnH = hashName(fn)
    const lnH = hashName(ln)
    if (fnH) userData.fn = [fnH]
    if (lnH) userData.ln = [lnH]
    const ct = hashCity(city)
    const zp = hashZip(zip)
    if (ct) userData.ct = [ct]
    if (zp) userData.zp = [zp]
    if (externalRaw) userData.external_id = [sha256Normalize(externalRaw)]
    if (row.client_ip) userData.client_ip_address = row.client_ip
    if (row.client_user_agent) userData.client_user_agent = row.client_user_agent
    if (row.fbp) userData.fbp = row.fbp
    if (row.fbc) userData.fbc = row.fbc

    const siteUrl = getSiteUrl()
    const event: Record<string, unknown> = {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: row.order_number,
      action_source: 'website',
      event_source_url: `${siteUrl}/payment/callback`,
      user_data: userData,
      custom_data: {
        value,
        currency: AD_CURRENCY,
        content_ids: contentIds,
        contents: contents.map((c) => ({
          id: c.id,
          quantity: c.quantity,
          item_price: c.item_price,
        })),
        content_type: 'product',
        order_id: row.order_number,
      },
    }

    const body: Record<string, unknown> = {
      data: [event],
    }
    const testCode = process.env.META_TEST_EVENT_CODE?.trim()
    if (testCode) {
      body.test_event_code = testCode
    }

    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[meta-capi] CAPI yanıt hatası', res.status, text, orderNumber)
    } else {
      devLog('[meta-capi] Purchase gönderildi', orderNumber, value)
    }
  } catch (err) {
    // Ödeme onayı ölçümden önemli — yut, logla
    console.error('[meta-capi] CAPI gönderim hatası', orderNumber, err)
  }
}

/** Fire-and-forget sarmalayıcı — ödeme akışını asla bozma */
export function trySendPurchaseOnce(orderNumber: string | null | undefined) {
  if (!orderNumber) return
  void sendPurchaseOnce(orderNumber).catch((err) => {
    console.error('[meta-capi] trySendPurchaseOnce', orderNumber, err)
  })
}
