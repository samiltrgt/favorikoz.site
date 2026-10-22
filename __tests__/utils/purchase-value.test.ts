jest.mock('server-only', () => ({}), { virtual: true })

import { isValidPurchaseValue } from '@/lib/analytics/purchase-value'
import { trackPurchaseBrowser } from '@/lib/analytics/datalayer'
import { applyConsentChoice, signalsFromState } from '@/lib/analytics/consent'
import { deliverMeta, type MetaEvent } from '@/lib/tracking/meta'

const invalidValues = [NaN, Infinity, -Infinity, null, undefined, 0, -1, '', '100', '125,50', '1.250,00', true, {}, []]
const originalPixel = process.env.META_PIXEL_ID
const originalToken = process.env.META_CAPI_ACCESS_TOKEN
const event = (value: unknown): MetaEvent => ({
  event_name: 'Purchase', event_id: 'purchase-unit-test', event_time: 1700000000,
  action_source: 'website', event_source_url: 'https://shop.test/checkout',
  user_data: {}, custom_data: { value, currency: 'TRY', order_id: 'purchase-unit-test' },
})

beforeEach(async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.mocked(fetch).mockReset()
  jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ events_received: 1 })))
  await applyConsentChoice('granted')
  jest.mocked(fetch).mockClear()
  window.dataLayer = []
  window.fkTagConfig = { mode: 'direct', metaPixelId: '123456789' }
  window.fbq = jest.fn()
  process.env.META_PIXEL_ID = '123456789'
  process.env.META_CAPI_ACCESS_TOKEN = 'unit-test-placeholder'
})

afterEach(() => {
  jest.restoreAllMocks()
  if (originalPixel === undefined) delete process.env.META_PIXEL_ID
  else process.env.META_PIXEL_ID = originalPixel
  if (originalToken === undefined) delete process.env.META_CAPI_ACCESS_TOKEN
  else process.env.META_CAPI_ACCESS_TOKEN = originalToken
})

test.each(invalidValues.map((value, index) => ({ value, index })))('blocks invalid value case $index before either channel emits', async ({ value }) => {
  expect(isValidPurchaseValue(value)).toBe(false)
  expect(trackPurchaseBrowser({ orderNumber: 'purchase-unit-test', value: value as number, contents: [],
    email: 'private@example.invalid', consent: signalsFromState('granted') })).toBe(false)
  expect(window.dataLayer).toEqual([])
  expect(window.fbq).not.toHaveBeenCalled()
  await expect(deliverMeta(event(value))).rejects.toThrow('invalid_purchase_value')
  expect(fetch).not.toHaveBeenCalled()
  expect(console.warn).toHaveBeenCalledWith('[tracking] Purchase blocked: invalid_purchase_value')
  expect(JSON.stringify(jest.mocked(console.warn).mock.calls)).not.toContain('private@example.invalid')
})

test.each([0.01, 100, 1250.49])('preserves value %s, TRY and the shared identity through JSON and both channels', async (value) => {
  expect(isValidPurchaseValue(value)).toBe(true)
  expect(trackPurchaseBrowser({ orderNumber: 'purchase-unit-test', value, contents: [],
    consent: signalsFromState('granted') })).toBe(true)
  await deliverMeta(event(value))
  const body = JSON.parse(String(jest.mocked(fetch).mock.calls[0][1]?.body))
  expect(body.data[0]).toMatchObject({ event_name: 'Purchase', event_id: 'purchase-unit-test',
    custom_data: { value, currency: 'TRY', order_id: 'purchase-unit-test' } })
  expect(typeof body.data[0].custom_data.value).toBe('number')
  expect(window.fbq).toHaveBeenCalledWith('track', 'Purchase', expect.objectContaining({ value, currency: 'TRY' }), { eventID: body.data[0].event_id })
})

test('rejects null introduced by nonfinite JSON serialization', async () => {
  const serialized = JSON.parse(JSON.stringify(event(NaN)))
  expect(serialized.custom_data.value).toBeNull()
  await expect(deliverMeta(serialized)).rejects.toThrow('invalid_purchase_value')
  expect(fetch).not.toHaveBeenCalled()
})

test('leaves non-Purchase event rules unchanged', async () => {
  await deliverMeta({ ...event(0), event_name: 'ViewContent' })
  expect(fetch).toHaveBeenCalledTimes(1)
})
