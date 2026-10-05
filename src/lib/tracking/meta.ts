import 'server-only'
import { hashNormalized } from './hash'

export type MetaEvent = { event_name: string; event_id: string; event_time: number; action_source: 'website'; event_source_url: string; user_data: Record<string, unknown>; custom_data: Record<string, unknown> }
export function buildMetaUserData(tracking: Record<string, unknown>, customer?: Record<string, any>): Record<string, unknown> {
  if ((tracking.consent as any)?.marketing !== true) return {}
  const result: Record<string, unknown> = {}
  const fullName = typeof customer?.customer_name === 'string' ? customer.customer_name.trim().split(/\s+/) : []
  const fields = { em: hashNormalized(customer?.customer_email), ph: hashNormalized(customer?.customer_phone, 'phone'), fn: hashNormalized(fullName[0]), ln: hashNormalized(fullName.slice(1).join(' ')), ct: hashNormalized(customer?.shipping_address?.city, 'compact'), zp: hashNormalized(customer?.shipping_address?.zipcode || customer?.shipping_address?.zipCode, 'compact'), external_id: hashNormalized(tracking.external_id), country: customer ? hashNormalized('tr') : undefined }
  for (const [key, hash] of Object.entries(fields)) if (hash) result[key] = [hash]
  for (const [target, source] of Object.entries({ fbp: 'fbp', fbc: 'fbc', client_ip_address: 'ip', client_user_agent: 'user_agent' })) if (typeof tracking[source] === 'string') result[target] = tracking[source]
  return result
}
export async function deliverMeta(event: MetaEvent): Promise<void> {
  const pixel = process.env.META_PIXEL_ID?.trim()
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim()
  if (!pixel || !token) throw new Error('meta_configuration_missing')
  const version = process.env.META_GRAPH_API_VERSION?.trim() || 'v21.0'
  if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(pixel)) throw new Error('meta_configuration_invalid')
  const body: Record<string, unknown> = { data: [event] }
  if (process.env.META_TEST_EVENT_CODE?.trim() && (process.env.NODE_ENV !== 'production' || process.env.META_ENABLE_TEST_EVENTS === 'true')) body.test_event_code = process.env.META_TEST_EVENT_CODE.trim()
  const response = await fetch(`https://graph.facebook.com/${version}/${pixel}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`meta_http_${response.status}`)
  const result = await response.json()
  if (result.events_received !== 1) throw new Error('meta_event_not_acknowledged')
}
