import { readConsentSignals } from '@/lib/analytics/consent'

export type BrowserTagConfig = {
  mode: 'gtm' | 'direct'
  metaPixelId?: string
  ga4MeasurementId?: string
  googleAdsId?: string
  googleAdsConversionLabel?: string
}

type Pixel = ((...args: unknown[]) => void) & {
  queue?: unknown[]
  callMethod?: (...args: unknown[]) => void
  loaded?: boolean
  version?: string
  push?: Pixel
}

declare global {
  interface Window {
    fkTagConfig?: BrowserTagConfig
    gtag?: (...args: unknown[]) => void
    fbq?: Pixel
    _fbq?: Pixel
  }
}

let initializedPixel: string | undefined
const initializedGoogle = new Set<string>()

function scriptOnce(id: string, src: string) {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

/** Explicit direct mode: GTM is omitted by layout so each platform has one owner. */
export function sendDirectBrowserEvent(event: string, payload: Record<string, unknown>) {
  const config = window.fkTagConfig
  if (config?.mode !== 'direct') return
  const consent = readConsentSignals()
  const metaEvents = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase']
  if (metaEvents.includes(event) && consent.ad_storage === 'granted' && config.metaPixelId) {
    if (!window.fbq) {
      const pixel: Pixel = function (...args: unknown[]) {
        if (pixel.callMethod) pixel.callMethod(...args)
        else pixel.queue!.push(args)
      }
      pixel.queue = []
      pixel.loaded = true
      pixel.version = '2.0'
      pixel.push = pixel
      window.fbq = pixel
      window._fbq = pixel
    }
    if (initializedPixel !== config.metaPixelId) {
      window.fbq('consent', 'grant')
      window.fbq('init', config.metaPixelId)
      initializedPixel = config.metaPixelId
      scriptOnce('fk-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js')
    }
    const { eventID, event_id: _eventId, event: _event, ecommerce: _ecommerce, user_data: _userData, ...params } = payload
    window.fbq('track', event, params, { eventID })
    return
  }
  const gaEvents = ['page_view', 'view_item', 'view_item_list', 'add_to_cart', 'begin_checkout', 'add_payment_info', 'purchase']
  if (!gaEvents.includes(event)) return
  const gaAllowed = consent.analytics_storage === 'granted' && !!config.ga4MeasurementId && payload.analytics_allowed !== false
  const adsTagAllowed = consent.ad_storage === 'granted' && !!config.googleAdsId
  const adsAllowed = event === 'purchase' && consent.ad_user_data === 'granted' && payload.marketing_allowed !== false && !!config.googleAdsId && !!config.googleAdsConversionLabel
  if (!gaAllowed && !adsTagAllowed) return
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function (..._args: unknown[]) { window.dataLayer!.push(arguments) }
  const targets = [gaAllowed ? config.ga4MeasurementId : undefined, adsTagAllowed ? config.googleAdsId : undefined].filter(Boolean) as string[]
  for (const target of targets) {
    if (initializedGoogle.has(target)) continue
    if (!initializedGoogle.size) window.gtag('js', new Date())
    window.gtag('config', target, { send_page_view: false, allow_enhanced_conversions: true })
    initializedGoogle.add(target)
  }
  scriptOnce('fk-google-tag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(targets[0])}`)
  const { user_data, eventID: _eventID, event_id: _eventId, contents: _contents, content_ids: _ids, content_type: _type, event: _event, ecommerce: _ecom, analytics_allowed: _analytics, marketing_allowed: _marketing, ...params } = payload
  if (gaAllowed) window.gtag('event', event, { ...params, send_to: config.ga4MeasurementId })
  if (adsAllowed) {
    if (user_data) window.gtag('set', 'user_data', user_data)
    window.gtag('event', 'conversion', {
      send_to: `${config.googleAdsId}/${config.googleAdsConversionLabel}`,
      value: payload.value,
      currency: payload.currency,
      transaction_id: payload.transaction_id,
    })
    window.gtag('set', 'user_data', null)
  }
}
