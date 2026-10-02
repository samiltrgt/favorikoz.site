/**
 * Tek tarayıcı borusu: dataLayer.
 * Layout'a fbq eklenmez — Meta/GA4/Ads etiketleri yalnızca GTM'den çıkar.
 */

import { AD_CURRENCY, type AdContentItem } from '@/lib/analytics/value'

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
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

function ecommercePayload(base: EcommerceBase) {
  return {
    value: base.value,
    currency: base.currency || AD_CURRENCY,
    content_ids: base.content_ids,
    contents: base.contents,
    content_type: base.content_type || 'product',
    items: base.items,
  }
}

/** Meta PageView + GA4 page_view (SPA route değişimi) */
export function trackPageView(path: string, eventID = newEventId()) {
  pushDataLayer({
    event: 'PageView',
    eventID,
    page_path: path,
  })
  pushDataLayer({
    event: 'page_view',
    eventID,
    page_path: path,
  })
}

/** Meta ViewContent + GA4 view_item */
export function trackViewContent(opts: {
  productId: string
  name?: string
  value: number
  eventID?: string
}) {
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
  pushDataLayer({ event: 'ViewContent', eventID, ...ecom })
  pushDataLayer({ event: 'view_item', eventID, ...ecom })
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
  pushDataLayer({
    event: 'view_item_list',
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
  pushDataLayer({ event: 'AddToCart', eventID, ...ecom })
  pushDataLayer({ event: 'add_to_cart', eventID, ...ecom })
}

/** Meta InitiateCheckout + GA4 begin_checkout */
export function trackInitiateCheckout(opts: {
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
  pushDataLayer({ event: 'InitiateCheckout', eventID, ...ecom })
  pushDataLayer({ event: 'begin_checkout', eventID, ...ecom })
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
  pushDataLayer({ event: 'AddPaymentInfo', eventID, ...ecom })
  pushDataLayer({ event: 'add_payment_info', eventID, ...ecom })
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
}) {
  const eventID = opts.orderNumber
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
    ...ecom,
  }
  pushDataLayer({ event: 'Purchase', ...shared })
  pushDataLayer({ event: 'purchase', ...shared })

  // Enhanced conversions — ham e-posta/telefon; hashlemeyi Google yapar
  if (opts.email || opts.phone) {
    pushDataLayer({
      event: 'enhanced_conversion_data',
      eventID,
      email: opts.email || undefined,
      phone_number: opts.phone || undefined,
    })
  }
}
