/**
 * Tek tarayıcı borusu: dataLayer.
 * GTM ve açıkça seçilen direct modu aynı olay sözleşmesini kullanır.
 */

import { AD_CURRENCY, type AdContentItem } from '@/lib/analytics/value'
import { readConsentSignals, type ConsentSignals } from '@/lib/analytics/consent'
import { getCheckoutTrackingPayload, consumePageEventId } from '@/lib/analytics/tracking'
import { sendDirectBrowserEvent } from '@/lib/analytics/browser-tags'

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

export function newEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function pushDataLayer(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(payload)
}

function dispatchEvents(metaEvent: string | null, googleEvent: string, payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return false
  const consent = readConsentSignals()
  let sent = false
  const emit = (event: string) => {
    const enriched = { ...payload, event_id: payload.eventID, event_source_url: `${location.origin}${location.pathname}`, event }
    if (payload.items) {
      pushDataLayer({ ecommerce: null })
      pushDataLayer({ ...enriched, ecommerce: { items: payload.items, value: payload.value, currency: payload.currency, transaction_id: payload.transaction_id, shipping: payload.shipping } })
    } else pushDataLayer(enriched)
    sendDirectBrowserEvent(event, enriched)
    sent = true
  }
  if (metaEvent && consent.ad_storage === 'granted' && payload.marketing_allowed !== false) {
    emit(metaEvent)
    if (metaEvent === 'PageView' && (consent.analytics_storage !== 'granted' || payload.analytics_allowed === false)) {
      // Initialize the Ads conversion linker even when GA4 itself is declined.
      sendDirectBrowserEvent('page_view', { ...payload, analytics_allowed: false })
    }
    if (metaEvent !== 'Purchase') {
      // Server receives the exact browser ID. Payment-confirmed Purchase comes from the outbox.
      void fetch('/api/e', {
        method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: metaEvent, eventId: payload.eventID,
          eventSourceUrl: `${location.origin}${location.pathname}`,
          value: payload.value, currency: payload.currency || AD_CURRENCY, contents: payload.contents,
          consent: { marketing: true, analytics: consent.analytics_storage === 'granted' },
          tracking: getCheckoutTrackingPayload(),
        }),
      }).catch(() => {})
    }
  }
  // The purchase dataLayer event also owns Google Ads when analytics is declined.
  if ((consent.analytics_storage === 'granted' && payload.analytics_allowed !== false) ||
      (googleEvent === 'purchase' && consent.ad_user_data === 'granted' && payload.marketing_allowed !== false)) emit(googleEvent)
  return sent
}

type EcommerceBase = {
  value: number
  currency?: string
  content_ids?: string[]
  contents?: AdContentItem[]
  content_type?: string
  items?: Array<{
    item_id: string
    item_name?: string
    quantity: number
    price: number
  }>
}

export type AllowedBrowserChannels = { marketing_allowed?: boolean; analytics_allowed?: boolean }

function ecommercePayload(base: EcommerceBase) {
  return {
    value: base.value,
    currency: base.currency || AD_CURRENCY,
    content_ids: base.content_ids,
    contents: base.contents,
    content_type: base.content_type || 'product',
    items: base.items || base.contents?.map((item) => ({ item_id: item.id, quantity: item.quantity, price: item.item_price })),
  }
}

/** Meta PageView + GA4 page_view (SPA route değişimi) */
export function trackPageView(path: string, eventID = consumePageEventId() || newEventId(), channels: AllowedBrowserChannels = {}) {
  return dispatchEvents('PageView', 'page_view', {
    eventID, page_path: path.split('?')[0],
    page_location: typeof location !== 'undefined' ? `${location.origin}${path.split('?')[0]}` : path.split('?')[0],
    ...channels,
  })
}

/** Meta ViewContent + GA4 view_item */
export function trackViewContent(opts: {
  productId: string
  name?: string
  value: number
  eventID?: string
} & AllowedBrowserChannels) {
  const eventID = opts.eventID || newEventId()
  const contents: AdContentItem[] = [
    { id: opts.productId, quantity: 1, item_price: opts.value },
  ]
  const ecom = ecommercePayload({
    value: opts.value,
    content_ids: [opts.productId],
    contents,
    items: [
      {
        item_id: opts.productId,
        item_name: opts.name,
        quantity: 1,
        price: opts.value,
      },
    ],
  })
  return dispatchEvents('ViewContent', 'view_item', { eventID, ...ecom, marketing_allowed: opts.marketing_allowed, analytics_allowed: opts.analytics_allowed })
}

/** GA4 view_item_list — boş listeyle basma */
export function trackViewItemList(opts: {
  itemListId: string
  itemListName: string
  items: Array<{ id: string; name?: string; price: number }>
  eventID?: string
}) {
  if (!opts.items.length) return
  const eventID = opts.eventID || newEventId()
  return dispatchEvents(null, 'view_item_list', {
    eventID,
    item_list_id: opts.itemListId,
    item_list_name: opts.itemListName,
    items: opts.items.map((item, index) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      index,
    })),
  })
}

/** Meta AddToCart + GA4 add_to_cart */
export function trackAddToCart(opts: {
  value: number
  contents: AdContentItem[]
  items?: EcommerceBase['items']
  eventID?: string
}) {
  const eventID = opts.eventID || newEventId()
  const ecom = ecommercePayload({
    value: opts.value,
    content_ids: opts.contents.map((c) => c.id),
    contents: opts.contents,
    items: opts.items,
  })
  return dispatchEvents('AddToCart', 'add_to_cart', { eventID, ...ecom })
}

/** Meta InitiateCheckout + GA4 begin_checkout */
export function trackInitiateCheckout(opts: {
  value: number
  contents: AdContentItem[]
  items?: EcommerceBase['items']
  eventID?: string
} & AllowedBrowserChannels) {
  const eventID = opts.eventID || newEventId()
  const ecom = ecommercePayload({
    value: opts.value,
    content_ids: opts.contents.map((c) => c.id),
    contents: opts.contents,
    items: opts.items,
  })
  return dispatchEvents('InitiateCheckout', 'begin_checkout', { eventID, ...ecom, marketing_allowed: opts.marketing_allowed, analytics_allowed: opts.analytics_allowed })
}

/** Meta AddPaymentInfo + GA4 add_payment_info — document.write ÖNCESİ */
export function trackAddPaymentInfo(opts: {
  value: number
  contents: AdContentItem[]
  items?: EcommerceBase['items']
  eventID?: string
}) {
  const eventID = opts.eventID || newEventId()
  const ecom = ecommercePayload({
    value: opts.value,
    content_ids: opts.contents.map((c) => c.id),
    contents: opts.contents,
    items: opts.items,
  })
  return dispatchEvents('AddPaymentInfo', 'add_payment_info', { eventID, ...ecom })
}

/**
 * Tarayıcı Purchase kopyası (dedup).
 * event_id = order_number. Sunucu zaten gönderdi; Meta dedup eder.
 * TC / kart verisi YOK.
 */
export function trackPurchaseBrowser(opts: {
  orderNumber: string
  value: number
  contents: AdContentItem[]
  shipping?: number
  email?: string
  phone?: string
  eventId?: string
  consent?: ConsentSignals
} & AllowedBrowserChannels) {
  const eventID = opts.eventId || opts.orderNumber
  const ecom = ecommercePayload({
    value: opts.value,
    content_ids: opts.contents.map((c) => c.id),
    contents: opts.contents,
    items: opts.contents.map((c) => ({
      item_id: c.id,
      quantity: c.quantity,
      price: c.item_price,
    })),
  })
  const shared = {
    eventID,
    event_id: eventID,
    order_id: opts.orderNumber,
    transaction_id: opts.orderNumber,
    shipping: opts.shipping,
    marketing_allowed: opts.consent?.ad_storage === 'granted' && opts.marketing_allowed !== false,
    analytics_allowed: opts.consent?.analytics_storage === 'granted' && opts.analytics_allowed !== false,
    high_value: opts.value > 1000,
    ...ecom,
  }
  const consent = readConsentSignals()
  if (shared.marketing_allowed && opts.consent?.ad_user_data === 'granted' && consent.ad_user_data === 'granted' && (opts.email || opts.phone)) {
    const digits = opts.phone?.replace(/\D/g, '').replace(/^0/, '')
    const userData = {
      email: opts.email?.trim().toLowerCase(),
      phone_number: digits ? `+${digits.startsWith('90') ? digits : `90${digits}`}` : undefined,
    }
    // Available before the conversion tag fires; never forwarded as GA4 parameters.
    pushDataLayer({ event: 'enhanced_conversion_data', eventID, user_data: userData })
    const sent = dispatchEvents('Purchase', 'purchase', { ...shared, user_data: userData })
    pushDataLayer({ user_data: null })
    return sent
  }
  return dispatchEvents('Purchase', 'purchase', shared)
}
