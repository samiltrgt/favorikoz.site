/**
 * Reklam tıklama kimlikleri — 90 gün birinci taraf çerez.
 * Checkout'ta siparişe yazılır (EMQ yükseltir).
 */

import { initializeTrackingConsent, readConsentSignals, type ConsentSignals } from '@/lib/analytics/consent'

export const TRACKING_COOKIE = 'fk_tracking'
export const TRACKING_MAX_AGE_DAYS = 90

export type TrackingIds = {
  fbclid?: string
  gclid?: string
  gbraid?: string
  wbraid?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

const CLICK_KEYS = [
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === 'undefined') return
  const maxAge = maxAgeDays * 24 * 60 * 60
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

export function readStoredTracking(): TrackingIds {
  if (readConsentSignals().ad_storage !== 'granted') return {}
  try {
    const raw = readCookie(TRACKING_COOKIE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as TrackingIds
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(CLICK_KEYS.filter((key) => typeof parsed[key] === 'string').map((key) => [key, parsed[key]]))
  } catch {
    return {}
  }
}

export function captureTrackingFromUrl(search?: string): TrackingIds {
  if (typeof window === 'undefined') return readStoredTracking()
  if (readConsentSignals().ad_storage !== 'granted') return {}
  const params = new URLSearchParams(search ?? window.location.search)
  const prev = readStoredTracking()
  const next: TrackingIds = { ...prev }
  let changed = false

  for (const key of CLICK_KEYS) {
    const val = params.get(key)
    if (val && val.length <= 500 && !/[\u0000-\u001f]/.test(val)) {
      next[key] = val
      changed = true
    }
  }

  if (changed) {
    writeCookie(TRACKING_COOKIE, JSON.stringify(next), TRACKING_MAX_AGE_DAYS)
  }
  const newClick = params.get('fbclid')
  if (newClick && next.fbclid === newClick) {
    const previousFbc = readCookie('_fbc')
    if (!previousFbc?.endsWith(`.${newClick}`)) {
      writeCookie('_fbc', `fb.1.${Date.now()}.${newClick}`, TRACKING_MAX_AGE_DAYS)
    }
  }
  return next
}

/** Meta _fbp çerezi (Pixel set eder; yoksa undefined) */
export function readFbp(): string | undefined {
  if (readConsentSignals().ad_storage !== 'granted') return undefined
  return readCookie('_fbp') || undefined
}

/**
 * Meta _fbc çerezi. Yoksa ama fbclid varsa: fb.1.{unix_ms}.{fbclid}
 */
export function readOrBuildFbc(fbclid?: string): string | undefined {
  if (readConsentSignals().ad_storage !== 'granted') return undefined
  const existing = readCookie('_fbc')
  if (existing) return existing
  const clickId = fbclid || readStoredTracking().fbclid
  if (!clickId) return undefined
  const fbc = `fb.1.${Date.now()}.${clickId}`
  writeCookie('_fbc', fbc, TRACKING_MAX_AGE_DAYS)
  return fbc
}

/** Checkout → POST /api/payment tracking gövdesi */
export function getCheckoutTrackingPayload(): TrackingIds & {
  fbp?: string
  fbc?: string
  consent: ConsentSignals
  event_source_url?: string
  google_client_id?: string
  google_session_id?: string
} {
  void initializeTrackingConsent()
  const ids = captureTrackingFromUrl()
  const consent = readConsentSignals()
  const ga = consent.analytics_storage === 'granted' ? readCookie('_ga')?.match(/^GA\d+\.\d+\.(\d+\.\d+)$/)?.[1] : undefined
  const measurementId = typeof window !== 'undefined' ? window.fkTagConfig?.ga4MeasurementId : undefined
  const sessionCookieNames = typeof document !== 'undefined' ? document.cookie.split(';').map((part) => part.trim().split('=')[0]).filter((name) => name.startsWith('_ga_')) : []
  const sessionCookieName = measurementId ? `_ga_${measurementId.replace(/^G-/, '')}` : sessionCookieNames.length === 1 ? sessionCookieNames[0] : undefined
  const sessionCookie = consent.analytics_storage === 'granted' && sessionCookieName
    ? readCookie(sessionCookieName) : undefined
  // GA cookies now also use GS2.1.s<session-id>$...; support both formats.
  const sessionId = sessionCookie?.match(/^GS\d+\.\d+\.(\d+)\./)?.[1] || sessionCookie?.match(/(?:^|[.$])s(\d+)(?:\$|$)/)?.[1]
  return {
    ...ids,
    fbp: readFbp(),
    fbc: readOrBuildFbc(ids.fbclid),
    consent,
    event_source_url: typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : undefined,
    google_client_id: ga,
    google_session_id: sessionId,
  }
}

/** Edge ID is consumed once by the initial page view, never by later interactions. */
export function consumePageEventId(): string | undefined {
  const id = readCookie('fk_page_event_id')
  if (!id) return undefined
  writeCookie('fk_page_event_id', '', 0)
  return /^evt_[a-f0-9-]{36}$/.test(id) ? id : undefined
}
