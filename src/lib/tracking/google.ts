import 'server-only'
export type GooglePurchase = { eventId: string; eventTime: number; value: number; shipping: number; contents: { id: string; quantity: number; item_price: number }[]; tracking: Record<string, any> }
/** GA4 purchase is server authoritative; transaction_id deduplicates retries. */
export async function deliverGooglePurchase(event: GooglePurchase): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim() || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim()
  const secret = process.env.GA4_API_SECRET?.trim()
  if (!measurementId || !secret) throw new Error('ga4_configuration_missing')
  if (!/^G-[A-Z\d]+$/.test(measurementId)) throw new Error('ga4_configuration_invalid')
  if (event.tracking.consent?.analytics !== true) throw new Error('ga4_consent_denied')
  if (typeof event.tracking.client_id !== 'string' || !/^\d+\.\d+$/.test(event.tracking.client_id)) throw new Error('ga4_client_id_missing')
  const params: Record<string, unknown> = { transaction_id: event.eventId, currency: 'TRY', value: event.value, shipping: event.shipping, engagement_time_msec: 1, items: event.contents.map((row) => ({ item_id: row.id, quantity: row.quantity, price: row.item_price })) }
  if (event.tracking.session_id && /^\d+$/.test(String(event.tracking.session_id))) params.session_id = Number(event.tracking.session_id)
  const body = { client_id: event.tracking.client_id, timestamp_micros: event.eventTime * 1000000, consent: { ad_user_data: event.tracking.consent.marketing ? 'GRANTED' : 'DENIED', ad_personalization: event.tracking.consent.marketing ? 'GRANTED' : 'DENIED' }, events: [{ name: 'purchase', params }] }
  const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(secret)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) })
  // GA4 collection acknowledges receipt only. Validate staging with /debug/mp/collect.
  if (!response.ok) throw new Error(`ga4_http_${response.status}`)
}
