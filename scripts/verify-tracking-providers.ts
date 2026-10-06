import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import { deliverMeta, buildMetaUserData } from '../src/lib/tracking/meta'
import { deliverGooglePurchase } from '../src/lib/tracking/google'

dotenv.config({ path: '.env.local', quiet: true })

// No order writes. Meta must be in Test Events; GA4 uses its validation endpoint.
async function main() {
  if (!process.env.META_TEST_EVENT_CODE?.trim()) throw new Error('meta_test_event_code_required')
  process.env.META_ENABLE_TEST_EVENTS = 'true'
  const eventId = `tracking-verification-${randomUUID()}`
  const timestamp = Math.floor(Date.now() / 1000)
  const tracking = { consent: { marketing: true, analytics: true }, external_id: 'isolated-tracking-verification',
    fbp: `fb.1.${Date.now()}.123456789`, ip: '127.0.0.1', user_agent: 'Tracking verification',
    client_id: '12345.67890', session_id: String(timestamp) }
  await deliverMeta({ event_name: 'Purchase', event_id: eventId, event_time: timestamp, action_source: 'website',
    event_source_url: `${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'http://localhost'}/checkout`,
    user_data: buildMetaUserData(tracking, { customer_email: 'tracking@example.invalid', customer_name: 'Tracking Test' }),
    custom_data: { value: 100, predicted_ltv: 250, currency: 'TRY', order_id: eventId,
      contents: [{ id: '11111111-1111-4111-8111-111111111111', quantity: 1, item_price: 100 }], content_type: 'product' } })
  console.log(`PASS Meta Test Events: events_received=1; event_id=${eventId}`)

  const originalFetch = globalThis.fetch
  let validated = false
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input))
    if (url.hostname !== 'www.google-analytics.com' || url.pathname !== '/mp/collect') throw new Error('unexpected_validation_request')
    url.pathname = '/debug/mp/collect'
    const body = JSON.parse(String(init?.body))
    body.validation_behavior = 'ENFORCE_RECOMMENDATIONS'
    const response = await originalFetch(url, { ...init, body: JSON.stringify(body) })
    if (!response.ok) throw new Error(`ga4_debug_http_${response.status}`)
    const result = await response.json()
    if (!Array.isArray(result.validationMessages) || result.validationMessages.length) {
      console.log('GA4 validation codes:', result.validationMessages?.map((message: { validationCode: string; fieldPath: string }) => ({ code: message.validationCode, field: message.fieldPath })))
      throw new Error('ga4_validation_failed')
    }
    validated = true
    return new Response(null, { status: 204 })
  }
  try {
    await deliverGooglePurchase({ eventId, eventTime: timestamp, value: 100, shipping: 0,
      contents: [{ id: '11111111-1111-4111-8111-111111111111', quantity: 1, item_price: 100 }], tracking })
    if (!validated) throw new Error('ga4_not_validated')
    console.log('PASS GA4 official validation: validationMessages=[]; no production purchase collected')
  } finally { globalThis.fetch = originalFetch }
}
main().catch(error => {
  // Do not print request URLs, credentials or third-party response bodies.
  console.error('FAIL provider verification:', /^[a-z0-9_]+$/i.test(error.message) ? error.message : 'network_or_configuration_failure')
  process.exitCode = 1
})
