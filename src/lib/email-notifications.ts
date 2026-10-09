import 'server-only'
import { createElement, type ReactElement } from 'react'
import { render } from '@react-email/render'
import { NotificationEmail, type NotificationProps } from '@/emails/notification'
import { OrderConfirmationEmail } from '@/emails/order-confirmation'
import { formatTRY, kurusToTl } from '@/lib/price'
import { getSiteUrl, isPreviewDeployment } from '@/lib/site-url'

export type EmailNotification = {
  id: string
  kind: 'order_confirmation' | 'admin_order' | 'shipping' | 'admin_signup' | 'welcome' | 'setup_test'
  order_id?: string | null
  payload: Record<string, any>
  lease_token: string
}
type Db = { from: (table: string) => any; rpc: (name: string, args: Record<string, unknown>) => any }
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const amount = (value: unknown) => formatTRY(kurusToTl(Number(value) || 0))

export async function buildNotificationEmail(event: EmailNotification) {
  const p = event.payload
  const admin = event.kind.startsWith('admin_') || event.kind === 'setup_test'
  const to = String(admin ? process.env.ADMIN_NOTIFICATION_EMAIL || '' : p.email || '').trim()
  if (!validEmail(to)) throw new Error('invalid_recipient')
  const site = getSiteUrl()
  let subject: string
  let component: ReactElement
  if (event.kind === 'order_confirmation') {
    subject = `Siparişiniz alındı — ${p.orderNumber}`
    component = createElement(OrderConfirmationEmail, {
      customerName: p.customerName || '', orderNumber: p.orderNumber,
      items: Array.isArray(p.items) ? p.items : [], subtotalLabel: amount(p.subtotal),
      shippingLabel: Number(p.shippingCost) > 0 ? `₺${amount(p.shippingCost)}` : 'Ücretsiz',
      totalLabel: amount(p.total), addressLine: p.address?.address || '-',
      cityZip: `${p.address?.city || ''} ${p.address?.zipcode || ''}`.trim(),
    })
  } else {
    let props: NotificationProps
    switch (event.kind) {
      case 'admin_order':
        subject = `Yeni sipariş — ${p.orderNumber}`
        props = { title: 'Yeni sipariş: ödeme alındı', paragraphs: ['Bir müşterinin sipariş ödemesi tamamlandı.'],
          details: [{ label: 'Sipariş no', value: p.orderNumber }, { label: 'Müşteri', value: p.customerName || '-' },
            { label: 'E-posta', value: p.email || '-' }, { label: 'Toplam', value: `₺${amount(p.total)}` }],
          link: { label: 'Siparişleri görüntüle', url: `${site}/admin/orders` } }
        break
      case 'shipping':
        subject = `Siparişiniz kargoya verildi — ${p.orderNumber}`
        props = { title: 'Siparişiniz kargoya verildi', greeting: `Merhaba ${p.customerName || 'müşterimiz'},`,
          paragraphs: ['Siparişiniz kargoya verildi.', ...(p.trackingNumber ? [] : ['Kargo takip numaranız henüz eklenmedi. Eklendiğinde ayrıca bilgilendirileceksiniz.'])],
          details: [{ label: 'Sipariş no', value: p.orderNumber }, { label: 'Kargo firması', value: p.carrier || 'Henüz belirtilmedi' },
            ...(p.trackingNumber ? [{ label: 'Takip numarası', value: p.trackingNumber }] : [])] }
        break
      case 'admin_signup':
        subject = 'Yeni müşteri kaydı — Favori Kozmetik'
        props = { title: 'Yeni müşteri kaydı', paragraphs: ['Sitenizde yeni bir müşteri hesabı oluşturuldu.'],
          details: [{ label: 'Müşteri', value: p.customerName || '-' }, { label: 'E-posta', value: p.email || '-' }],
          link: { label: 'Müşterileri görüntüle', url: `${site}/admin/customers` } }
        break
      case 'welcome':
        subject = 'Favori Kozmetik’e hoş geldiniz'
        props = { title: 'Favori Kozmetik’e hoş geldiniz', greeting: `Merhaba ${p.customerName || 'müşterimiz'},`,
          paragraphs: ['E-posta adresiniz doğrulandı. Hesabınızla alışveriş yapabilir ve siparişlerinizi takip edebilirsiniz.'],
          link: { label: 'Mağazayı ziyaret et', url: site } }
        break
      case 'setup_test':
        subject = 'Favori Kozmetik — e-posta bildirimleri kurulum testi'
        props = { title: 'E-posta bildirimleri kurulum testi', paragraphs: [
          'Bu bir kurulum testidir; yeni bir sipariş, kargo gönderimi veya müşteri kaydı değildir.',
          'Yeni müşteri kaydı ve ödemesi tamamlanan sipariş bildirimleri bu adrese gönderilecek.',
          'Müşteriler sipariş onayı, kargo bildirimi ve e-posta doğrulamasından sonra hoş geldiniz maili alacak.',
        ] }
        break
      default: throw new Error('unknown_notification_kind')
    }
    component = createElement(NotificationEmail, props)
  }
  const [html, text] = await Promise.all([render(component), render(component, { plainText: true })])
  return { to, subject, html, text }
}

/** Queue entries are created by event triggers, never by reading historical orders. */
export async function processEmailNotifications(db: Db, orderId?: string): Promise<{ sent: number; failed: number }> {
  if (isPreviewDeployment()) return { sent: 0, failed: 0 }
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.ORDER_FROM_EMAIL?.trim()
  if (!apiKey || !from || from.includes('@resend.dev')) throw new Error('email_sender_not_configured')
  const { data, error } = await db.rpc('claim_email_notifications', { p_limit: 4, p_order_id: orderId || null })
  if (error) throw new Error('email_claim_failed')
  let sent = 0, failed = 0
  for (const event of (data || []) as EmailNotification[]) {
    let providerId: string | null = null
    let failure: string | null = null
    let retry = false
    let suppressed = false
    try {
      if (event.order_id) {
        const { data: order, error: lookupError } = await db.from('orders').select('status,payment_status,carrier,tracking_number').eq('id', event.order_id).maybeSingle()
        if (lookupError) throw new Error('order_lookup_unavailable')
        if (!order || order.payment_status !== 'completed' || ['cancelled','refunded'].includes(order.status)) {
          suppressed = true; failure = 'order_no_longer_payable'
        }
        if (!suppressed && event.kind === 'shipping' &&
          ((order.carrier || '') !== (event.payload.carrier || '') || (order.tracking_number || '') !== (event.payload.trackingNumber || ''))) {
          suppressed = true; failure = 'shipping_details_superseded'
        }
      }
      if (!suppressed) {
        const email = await buildNotificationEmail(event)
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `notification/${event.id}` },
          body: JSON.stringify({ from, ...email }), signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) {
          failure = `resend_http_${response.status}`
          retry = response.status >= 500 || [429, 409].includes(response.status)
        } else {
          providerId = (await response.json()).id || null
          if (!providerId) { failure = 'provider_missing_id'; retry = true }
        }
      }
    } catch (err) {
      failure = err instanceof Error && ['invalid_recipient','unknown_notification_kind'].includes(err.message) ? err.message : 'email_send_unavailable'
      retry = !['invalid_recipient','unknown_notification_kind'].includes(failure)
    }
    const result = await db.rpc('finish_email_notification', {
      p_id: event.id, p_lease_token: event.lease_token, p_provider_id: providerId,
      p_error: failure, p_retry: retry, p_suppressed: suppressed,
    })
    if (result.error || result.data !== true) throw new Error('email_result_not_saved')
    if (providerId) sent++
    else if (!suppressed) failed++
  }
  return { sent, failed }
}
export async function tryProcessOrderNotifications(db: Db, orderId: string): Promise<void> {
  try { await processEmailNotifications(db, orderId) }
  catch (err) { console.error('[email-notifications]', err instanceof Error ? err.message : 'notification_processing_failed') }
}
