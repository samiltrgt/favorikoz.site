import { applyConsentChoice, applyConsentPreferences, readConsentSignals, signalsFromState, consentDefaultSnippet, syncPendingConsent, initializeTrackingConsent } from '@/lib/analytics/consent'
import { captureTrackingFromUrl, getCheckoutTrackingPayload, readOrBuildFbc } from '@/lib/analytics/tracking'
import { trackAddToCart, trackPageView, trackPurchaseBrowser, trackViewContent } from '@/lib/analytics/datalayer'

const contents = [{ id: 'product-1', quantity: 2, item_price: 150 }]
const events = () => (window.dataLayer || []).filter((row: any) => row.event) as Array<Record<string, any>>
const capiCalls = () => jest.mocked(fetch).mock.calls.filter((call) => call[0] === '/api/e')

beforeEach(() => {
  for (const cookie of document.cookie.split(';')) document.cookie = `${cookie.trim().split('=')[0]}=; Path=/; Max-Age=0`
  window.dataLayer = []
  delete window.fkTagConfig
  delete window.gtag
  delete window.fbq
  delete window._fbq
  document.getElementById('fk-meta-pixel')?.remove()
  document.getElementById('fk-google-tag')?.remove()
  window.history.replaceState({}, '', '/')
  jest.mocked(fetch).mockReset()
  jest.mocked(fetch).mockResolvedValue(new Response('{}'))
})

it('does not persist ad IDs or send browser/server events without consent', async () => {
  expect(captureTrackingFromUrl('?fbclid=click&gclid=google')).toEqual({})
  expect(trackAddToCart({ value: 300, contents })).toBe(false)
  expect(document.cookie).not.toContain('fk_tracking')
  expect(events()).toEqual([])
  expect(capiCalls()).toHaveLength(0)
  expect(getCheckoutTrackingPayload().consent).toEqual(signalsFromState('denied'))
})

it('keeps analytics-only permission separate from ad attribution and Meta', async () => {
  await applyConsentPreferences({ analytics: true, marketing: false })
  window.dataLayer = []
  trackViewContent({ productId: 'product-1', value: 150 })
  expect(events().map((row) => row.event)).toEqual(['view_item'])
  expect(capiCalls()).toHaveLength(0)
  expect(captureTrackingFromUrl('?fbclid=click')).toEqual({})
  expect(readConsentSignals()).toEqual({ ...signalsFromState('denied'), analytics_storage: 'granted' })
})

it('uses a fresh ID per interaction and the identical ID for its Meta browser/server pair', async () => {
  await applyConsentChoice('granted')
  window.dataLayer = []
  trackAddToCart({ value: 300, contents })
  trackAddToCart({ value: 300, contents })
  const meta = events().filter((row) => row.event === 'AddToCart')
  expect(meta[0].eventID).not.toBe(meta[1].eventID)
  const body = JSON.parse(capiCalls()[0][1]!.body as string)
  expect(body.eventId).toBe(meta[0].eventID)
  expect(body.eventName).toBe('AddToCart')
  expect(body.value).toBe(300)
  expect(events()[1].ecommerce).toMatchObject({ value: 300, currency: 'TRY' })
})

it('consumes the Edge page ID only once and strips payment tokens from event URLs', async () => {
  await applyConsentChoice('granted')
  window.dataLayer = []
  const edgeId = 'evt_11111111-1111-4111-8111-111111111111'
  document.cookie = `fk_page_event_id=${edgeId}; Path=/`
  window.history.replaceState({}, '', '/payment/callback?token=secret&orderNumber=123')
  trackPageView('/payment/callback?token=secret&orderNumber=123')
  trackPageView('/another')
  const pages = events().filter((row) => row.event === 'PageView')
  expect(pages[0].eventID).toBe(edgeId)
  expect(pages[1].eventID).not.toBe(edgeId)
  expect(pages[0].page_path).toBe('/payment/callback')
  expect(JSON.stringify(window.dataLayer)).not.toContain('secret')
  expect(document.cookie).not.toContain('fk_page_event_id')
})

it('captures a new Facebook click without regenerating its fbc timestamp on every checkout read', async () => {
  await applyConsentChoice('granted')
  captureTrackingFromUrl('?fbclid=first')
  const first = readOrBuildFbc()
  expect(readOrBuildFbc()).toBe(first)
  captureTrackingFromUrl('?fbclid=second')
  expect(readOrBuildFbc()).toMatch(/^fb\.1\.\d+\.second$/)
  expect(readOrBuildFbc()).not.toBe(first)
})

it('revocation removes measurement cookies, clears matching data, and pauses Meta', async () => {
  await applyConsentChoice('granted')
  document.cookie = '_fbp=facebook; Path=/'
  document.cookie = '_ga=GA1.1.123.456; Path=/'
  document.cookie = '_ga_TEST=GS2.1.s123$o2; Path=/'
  captureTrackingFromUrl('?gclid=google')
  window.fbq = jest.fn()
  await applyConsentChoice('denied')
  expect(window.fbq).toHaveBeenCalledWith('consent', 'revoke')
  expect(document.cookie).not.toMatch(/_fbp=|_ga=|_ga_TEST=|fk_tracking=/)
  expect(window.dataLayer).toContainEqual({ user_data: null, email: null, phone_number: null })
})

it('fails closed for historical purchases without recorded consent even after a later acceptance', async () => {
  await applyConsentChoice('granted')
  window.dataLayer = []
  expect(trackPurchaseBrowser({ orderNumber: 'ORD-1', value: 300, contents, email: 'private@example.com' })).toBe(false)
  expect(events()).toEqual([])
})

it('provides enhanced matching data before conversion and clears it afterward', async () => {
  await applyConsentChoice('granted')
  window.dataLayer = []
  trackPurchaseBrowser({ orderNumber: 'ORD-1', value: 300, contents, email: ' Test@Example.com ', phone: '0532 123 45 67', consent: signalsFromState('granted') })
  expect(events().map((row) => row.event)).toEqual(['enhanced_conversion_data', 'Purchase', 'purchase'])
  expect(events()[0].user_data).toEqual({ email: 'test@example.com', phone_number: '+905321234567' })
  expect(events()[1].eventID).toBe('ORD-1')
  expect(events()[2].transaction_id).toBe('ORD-1')
  expect(window.dataLayer!.at(-1)).toEqual({ user_data: null })
  expect(capiCalls()).toHaveLength(0)
})

it('direct mode sends Ads matching before its conversion, excludes PII from GA4, and disables auto page views', async () => {
  await applyConsentChoice('granted')
  window.dataLayer = []
  window.fkTagConfig = { mode: 'direct', ga4MeasurementId: 'G-UNITTEST', googleAdsId: 'AW-UNITTEST', googleAdsConversionLabel: 'label' }
  window.gtag = jest.fn()
  trackPurchaseBrowser({ orderNumber: 'ORD-2', value: 300, contents, email: 'test@example.com', consent: signalsFromState('granted') })
  expect(window.gtag).toHaveBeenCalledWith('config', 'G-UNITTEST', expect.objectContaining({ send_page_view: false }))
  const calls = jest.mocked(window.gtag!).mock.calls
  const matching = calls.findIndex((call) => call[0] === 'set' && call[1] === 'user_data' && call[2] !== null)
  const conversion = calls.findIndex((call) => call[0] === 'event' && call[1] === 'conversion')
  expect(matching).toBeGreaterThan(-1)
  expect(matching).toBeLessThan(conversion)
  const gaPurchase = calls.find((call) => call[0] === 'event' && call[1] === 'purchase')
  expect(JSON.stringify(gaPurchase)).not.toContain('test@example.com')
  expect(calls[conversion][2]).toMatchObject({ send_to: 'AW-UNITTEST/label', transaction_id: 'ORD-2' })
})

it('GTM mode does not also issue direct Pixel or Google events', async () => {
  await applyConsentChoice('granted')
  window.fkTagConfig = { mode: 'gtm', metaPixelId: '123', ga4MeasurementId: 'G-TEST' }
  window.fbq = jest.fn()
  window.gtag = jest.fn()
  trackPageView('/')
  expect(window.fbq).not.toHaveBeenCalled()
  expect(window.gtag).not.toHaveBeenCalled()
})

it('marketing-only direct mode initializes Google Ads attribution without a GA4 event', async () => {
  await applyConsentPreferences({ analytics: false, marketing: true })
  window.fkTagConfig = { mode: 'direct', ga4MeasurementId: 'G-DENIED', googleAdsId: 'AW-ADS-ONLY' }
  window.gtag = jest.fn()
  trackPageView('/')
  expect(window.gtag).toHaveBeenCalledWith('config', 'AW-ADS-ONLY', expect.objectContaining({ send_page_view: false }))
  expect(jest.mocked(window.gtag!).mock.calls.some((call) => call[0] === 'event')).toBe(false)
})

it('captures GS2 Google session identifiers in GTM mode when exactly one stream cookie exists', async () => {
  await applyConsentChoice('granted')
  document.cookie = '_ga=GA1.1.123.456; Path=/'
  document.cookie = '_ga_STREAM=GS2.1.s1712345678$o2$g1$t1712345680; Path=/'
  expect(getCheckoutTrackingPayload()).toMatchObject({ google_client_id: '123.456', google_session_id: '1712345678' })
})

it('direct Pixel uses the same eventID as CAPI and resumes after consent is granted again', async () => {
  await applyConsentChoice('granted')
  window.fkTagConfig = { mode: 'direct', metaPixelId: '123456789' }
  window.fbq = jest.fn()
  trackViewContent({ productId: 'product-1', value: 150, eventID: 'evt-product-1' })
  expect(window.fbq).toHaveBeenCalledWith('track', 'ViewContent', expect.objectContaining({ value: 150 }), { eventID: 'evt-product-1' })
  await applyConsentChoice('denied')
  await applyConsentChoice('granted')
  expect(window.fbq).toHaveBeenLastCalledWith('consent', 'grant')
})

it('marks HighValue purchases only above 1000 TRY', async () => {
  await applyConsentChoice('granted')
  window.dataLayer = []
  trackPurchaseBrowser({ orderNumber: 'ORD-THRESHOLD', value: 1000, contents, consent: signalsFromState('granted') })
  trackPurchaseBrowser({ orderNumber: 'ORD-HIGH', value: 1000.01, contents, consent: signalsFromState('granted') })
  expect(events().filter((row) => row.event === 'Purchase').map((row) => row.high_value)).toEqual([false, true])
})

it('queues Consent Mode defaults and a separate saved analytics choice before measurement', async () => {
  document.cookie = 'fk_consent=denied; Path=/'
  document.cookie = 'fk_consent_analytics=granted; Path=/'
  document.cookie = 'fk_tracking_owner=11111111-1111-4111-8111-111111111111; Path=/'
  new Function(consentDefaultSnippet())()
  const commands = window.dataLayer!.map((row) => Array.from(row as IArguments))
  expect(commands[0]).toEqual(['consent', 'default', expect.objectContaining(signalsFromState('denied'))])
  expect(commands[1]).toEqual(['consent', 'update', { ...signalsFromState('denied'), analytics_storage: 'granted' }])
})

it('creates an opaque owner after consent and waits for cookie-authoritative server acknowledgement', async () => {
  let acknowledge!: (response: Response) => void
  let cookiesAtRequest = ''
  jest.mocked(fetch).mockImplementationOnce(async () => {
    cookiesAtRequest = document.cookie
    return new Promise<Response>((resolve) => { acknowledge = resolve })
  })
  const grant = applyConsentChoice('granted')
  expect(cookiesAtRequest).toMatch(/fk_tracking_owner=[a-f0-9-]{36}/)
  expect(cookiesAtRequest).toContain('fk_consent=granted')
  expect(cookiesAtRequest).toMatch(/fk_consent_version=\d+/)
  expect(readConsentSignals()).toEqual(signalsFromState('denied'))
  expect(trackAddToCart({ value: 300, contents })).toBe(false)
  expect(jest.mocked(fetch).mock.calls[0]).toMatchObject([
    '/api/tracking/consent', { method: 'POST', credentials: 'same-origin', keepalive: true, body: '{}' },
  ])
  acknowledge(new Response('{}'))
  expect(await grant).toBe(true)
  expect(readConsentSignals()).toEqual(signalsFromState('granted'))
  expect(document.cookie).not.toContain('fk_consent_pending')
})

it('keeps withdrawal effective and durable after server rejection, retries, and retains its owner key', async () => {
  await applyConsentChoice('granted')
  const ownerCookie = document.cookie.split(';').find((cookie) => cookie.trim().startsWith('fk_tracking_owner='))?.trim()
  jest.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 503 }))
  expect(await applyConsentChoice('denied')).toBe(false)
  expect(readConsentSignals()).toEqual(signalsFromState('denied'))
  expect(document.cookie).toContain('fk_consent_pending=1')
  expect(document.cookie).toContain(ownerCookie)
  expect(trackAddToCart({ value: 300, contents })).toBe(false)
  expect(await syncPendingConsent()).toBe(true)
  expect(document.cookie).not.toContain('fk_consent_pending')
  expect(document.cookie).toContain(ownerCookie)
})

it('does not accept an older grant acknowledgement after a newer local withdrawal', async () => {
  let acknowledge!: (response: Response) => void
  jest.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { acknowledge = resolve }))
  const grant = applyConsentChoice('granted')
  const firstVersion = Number(document.cookie.match(/fk_consent_version=(\d+)/)?.[1])
  const withdrawal = applyConsentChoice('denied')
  expect(Number(document.cookie.match(/fk_consent_version=(\d+)/)?.[1])).toBeGreaterThan(firstVersion)
  acknowledge(new Response('{}'))
  expect(await grant).toBe(false)
  expect(await withdrawal).toBe(false)
  expect(document.cookie).toContain('fk_consent_pending=1')
  expect(readConsentSignals()).toEqual(signalsFromState('denied'))
  expect(await syncPendingConsent()).toBe(true)
  expect(readConsentSignals()).toEqual(signalsFromState('denied'))
})

it('initializes withdrawal mapping for legacy granted visitors before their next tracked event', async () => {
  document.cookie = 'fk_consent=granted; Path=/'
  expect(readConsentSignals()).toEqual(signalsFromState('denied'))
  getCheckoutTrackingPayload()
  expect(document.cookie).toMatch(/fk_tracking_owner=[a-f0-9-]{36}/)
  expect(await initializeTrackingConsent()).toBe(true)
  expect(readConsentSignals()).toEqual(signalsFromState('granted'))
})

it('withdraws marketing immediately while retaining acknowledged analytics and its client ID', async () => {
  await applyConsentChoice('granted')
  document.cookie = '_ga=GA1.1.123.456; Path=/'
  document.cookie = '_fbp=fb.1.1712345678901.123456; Path=/'
  jest.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 503 }))
  expect(await applyConsentPreferences({ analytics: true, marketing: false })).toBe(false)
  expect(readConsentSignals()).toEqual({ ...signalsFromState('denied'), analytics_storage: 'granted' })
  expect(document.cookie).toContain('_ga=GA1.1.123.456')
  expect(document.cookie).not.toContain('_fbp=')
  expect(getCheckoutTrackingPayload().google_client_id).toBe('123.456')
  await syncPendingConsent()
})

it('holds a newly requested channel until acknowledgement without pausing an existing permitted channel', async () => {
  await applyConsentPreferences({ analytics: true, marketing: false })
  document.cookie = '_ga=GA1.1.123.456; Path=/'
  jest.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 503 }))
  expect(await applyConsentPreferences({ analytics: true, marketing: true })).toBe(false)
  expect(readConsentSignals()).toEqual({ ...signalsFromState('denied'), analytics_storage: 'granted' })
  expect(document.cookie).toContain('_ga=GA1.1.123.456')
  await syncPendingConsent()
  expect(readConsentSignals()).toEqual(signalsFromState('granted'))
})
