export const BROWSER_EVENTS = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo'] as const
export type BrowserEventName = typeof BROWSER_EVENTS[number]
export type TrackingConsent = { analytics: boolean; marketing: boolean }
export type TrackingIdentity = Record<string, unknown> & { consent: TrackingConsent }
export type BrowserEvent = {
  eventName: BrowserEventName
  eventId: string
  eventSourceUrl: string
  value?: number
  currency: 'TRY'
  contents: { id: string; quantity: number; item_price: number }[]
  tracking: Record<string, unknown>
}

/** Allowlist and bound untrusted first-party input; Purchase is server-only. */
export function parseBrowserEvent(input: unknown, origin: string): BrowserEvent | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const body = input as Record<string, unknown>
  if (!BROWSER_EVENTS.includes(body.eventName as BrowserEventName)) return null
  if (typeof body.eventId !== 'string' || !/^[\w:.-]{8,128}$/.test(body.eventId)) return null
  if (typeof body.eventSourceUrl !== 'string' || body.eventSourceUrl.length > 2048) return null
  let source: URL
  try { source = new URL(body.eventSourceUrl) } catch { return null }
  if (source.origin !== origin) return null
  // No query string: URLs can contain email, tokens, or other checkout PII.
  source.search = ''; source.hash = ''
  if (body.currency !== undefined && body.currency !== 'TRY') return null
  if (body.value !== undefined && (typeof body.value !== 'number' || !Number.isFinite(body.value) || body.value < 0 || body.value > 10000000)) return null
  const contents: BrowserEvent['contents'] = []
  if (body.contents !== undefined) {
    if (!Array.isArray(body.contents) || body.contents.length > 100) return null
    for (const row of body.contents) {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || row.id.length > 128 || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 1000 || typeof row.item_price !== 'number' || !Number.isFinite(row.item_price) || row.item_price < 0 || row.item_price > 10000000) return null
      contents.push({ id: row.id, quantity: row.quantity, item_price: row.item_price })
    }
  }
  return { eventName: body.eventName as BrowserEventName, eventId: body.eventId, eventSourceUrl: source.href, value: body.value as number | undefined, currency: 'TRY', contents, tracking: body.tracking && typeof body.tracking === 'object' && !Array.isArray(body.tracking) ? body.tracking as Record<string, unknown> : {} }
}
