/**
 * KVKK / Consent Mode v2 — çerez tercihleri
 * Varsayılan: denied. Onay alınmadan pazarlama etiketleri tetiklenmez (GTM Consent).
 */

export const CONSENT_COOKIE = 'fk_consent'
export const ANALYTICS_CONSENT_COOKIE = 'fk_consent_analytics'
export const CONSENT_CHANGED_EVENT = 'fk:consent-changed'
export const CONSENT_MAX_AGE_DAYS = 365
export const TRACKING_OWNER_COOKIE = 'fk_tracking_owner'
const CONSENT_PENDING_COOKIE = 'fk_consent_pending'
const CONSENT_VERSION_COOKIE = 'fk_consent_version'
const CONSENT_ACK_COOKIE = 'fk_consent_ack'
let consentSyncInFlight: Promise<boolean> | null = null
let consentRetryTimer: ReturnType<typeof setTimeout> | null = null
let retryDelay = 1000

export type ConsentState = 'granted' | 'denied' | null

export type ConsentSignals = {
  ad_storage: 'granted' | 'denied'
  analytics_storage: 'granted' | 'denied'
  ad_user_data: 'granted' | 'denied'
  ad_personalization: 'granted' | 'denied'
}

export function signalsFromState(state: 'granted' | 'denied'): ConsentSignals {
  return {
    ad_storage: state,
    analytics_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  }
}

export function readConsentCookie(): ConsentState {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))
  const value = match?.[1]
  if (value === 'granted' || value === 'denied') return value
  return null
}

export function readSavedConsentSignals(): ConsentSignals {
  const marketing = readConsentCookie() === 'granted' ? 'granted' : 'denied'
  const match = typeof document !== 'undefined'
    ? document.cookie.match(/(?:^|; )fk_consent_analytics=([^;]*)/)
    : null
  const analytics = match?.[1] === 'granted' || match?.[1] === 'denied' ? match[1] : marketing
  return { ...signalsFromState(marketing), analytics_storage: analytics }
}

/** Grant is held until the server acknowledges it; withdrawal takes effect immediately. */
export function readConsentSignals(): ConsentSignals {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cookieValue(TRACKING_OWNER_COOKIE) || '')) return signalsFromState('denied')
  const requested = readSavedConsentSignals()
  if (cookieValue(CONSENT_PENDING_COOKIE) !== '1') return requested
  const acknowledged = cookieValue(CONSENT_ACK_COOKIE) || '00'
  const marketing = requested.ad_storage === 'granted' && acknowledged[1] === '1' ? 'granted' : 'denied'
  const analytics = requested.analytics_storage === 'granted' && acknowledged[0] === '1' ? 'granted' : 'denied'
  return { ...signalsFromState(marketing), analytics_storage: analytics }
}

function cookieValue(name: string): string | undefined {
  return typeof document === 'undefined' ? undefined : document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1)
}

function writeNecessaryCookie(name: string, value: string, maxAge = CONSENT_MAX_AGE_DAYS * 86400) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

/** A random withdrawal key, created after consent; it never contains an account or email. */
export function ensureTrackingOwner(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const existing = cookieValue(TRACKING_OWNER_COOKIE)
  if (existing && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(existing)) {
    // Retain the withdrawal key throughout the lifespan of newly queued events.
    writeNecessaryCookie(TRACKING_OWNER_COOKIE, existing)
    if (!cookieValue(CONSENT_VERSION_COOKIE)) {
      writeNecessaryCookie(CONSENT_VERSION_COOKIE, String(Date.now()))
      writeNecessaryCookie(CONSENT_PENDING_COOKIE, '1')
    }
    return existing
  }
  const consent = readSavedConsentSignals()
  if (consent.ad_storage !== 'granted' && consent.analytics_storage !== 'granted') return undefined
  let owner: string
  if (typeof crypto.randomUUID === 'function') owner = crypto.randomUUID()
  else {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 15) | 64
    bytes[8] = (bytes[8] & 63) | 128
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
    owner = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  writeNecessaryCookie(TRACKING_OWNER_COOKIE, owner)
  writeNecessaryCookie(CONSENT_ACK_COOKIE, '00')
  if (!cookieValue(CONSENT_VERSION_COOKIE)) writeNecessaryCookie(CONSENT_VERSION_COOKIE, String(Date.now()))
  writeNecessaryCookie(CONSENT_PENDING_COOKIE, '1')
  return owner
}

function consentSignature() {
  return `${cookieValue(CONSENT_VERSION_COOKIE) || ''}:${JSON.stringify(readSavedConsentSignals())}`
}

function scheduleConsentRetry() {
  if (consentRetryTimer) return
  consentRetryTimer = setTimeout(() => {
    consentRetryTimer = null
    void syncPendingConsent()
  }, retryDelay)
  retryDelay = Math.min(retryDelay * 2, 30000)
}

/** Only current cookies are sent. Persisted pending state retries after reload/offline. */
export function syncPendingConsent(): Promise<boolean> {
  if (typeof window === 'undefined' || cookieValue(CONSENT_PENDING_COOKIE) !== '1') return Promise.resolve(true)
  if (consentSyncInFlight) return consentSyncInFlight
  if (!cookieValue(TRACKING_OWNER_COOKIE)) return Promise.resolve(false)
  const signature = consentSignature()
  consentSyncInFlight = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('/api/tracking/consent', {
        method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: '{}', signal: controller.signal,
      })
      if (!response.ok) return false
      // A previous grant response must never acknowledge a newer withdrawal.
      if (signature !== consentSignature()) return false
      const requested = readSavedConsentSignals()
      writeNecessaryCookie(CONSENT_ACK_COOKIE, `${requested.analytics_storage === 'granted' ? '1' : '0'}${requested.ad_storage === 'granted' ? '1' : '0'}`)
      writeNecessaryCookie(CONSENT_PENDING_COOKIE, '', 0)
      retryDelay = 1000
      if (consentRetryTimer) { clearTimeout(consentRetryTimer); consentRetryTimer = null }
      const signals = readConsentSignals()
      pushConsentUpdate(signals)
      window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: signals }))
      return true
    } catch { return false }
    finally {
      clearTimeout(timeout)
      consentSyncInFlight = null
      if (cookieValue(CONSENT_PENDING_COOKIE) === '1') scheduleConsentRetry()
    }
  })()
  return consentSyncInFlight
}

export function initializeTrackingConsent(): Promise<boolean> {
  ensureTrackingOwner()
  return syncPendingConsent()
}

export function writeConsentCookie(state: 'granted' | 'denied') {
  if (typeof document === 'undefined') return
  const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${state}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

/** dataLayer + gtag consent update (GTM dinler) */
export function pushConsentUpdate(state: 'granted' | 'denied' | ConsentSignals, cleanupSignals?: ConsentSignals) {
  if (typeof window === 'undefined') return
  const signals = typeof state === 'string' ? signalsFromState(state) : state
  const cleanup = cleanupSignals || signals
  const w = window as Window & {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
  w.dataLayer = w.dataLayer || []
  if (typeof w.gtag === 'function') {
    w.gtag('consent', 'update', signals)
  } else {
    // gtag henüz yoksa dataLayer üzerinden (GTM Consent Initialization okur)
    // gtag queues Arguments objects, not arrays (GTM recognizes this command form).
    const queue = function (..._args: unknown[]) { w.dataLayer!.push(arguments) }
    queue('consent', 'update', signals)
  }
  w.dataLayer.push({
    event: 'consent_update',
    ...signals,
  })
  window.fbq?.('consent', signals.ad_storage === 'granted' ? 'grant' : 'revoke')
  if (cleanup.ad_storage === 'denied') {
    clearMeasurementCookies(['fk_tracking', '_fbp', '_fbc', 'fk_page_event_id', 'evt_id', '_gcl_au', '_gcl_aw', '_gcl_dc'])
    w.dataLayer.push({ user_data: null, email: null, phone_number: null })
    w.gtag?.('set', 'user_data', null)
  }
  if (cleanup.analytics_storage === 'denied') clearMeasurementCookies(['_ga', '_gid'])
}

export function applyConsentChoice(state: 'granted' | 'denied') {
  return applyConsentPreferences({ marketing: state === 'granted', analytics: state === 'granted' })
}

export function applyConsentPreferences(preferences: { analytics: boolean; marketing: boolean }) {
  if (typeof document === 'undefined') return Promise.resolve(false)
  writeConsentCookie(preferences.marketing ? 'granted' : 'denied')
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${preferences.analytics ? 'granted' : 'denied'}; Path=/; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`
  const storedVersion = Number(cookieValue(CONSENT_VERSION_COOKIE))
  const previousVersion = Number.isSafeInteger(storedVersion) && storedVersion >= 0 && storedVersion < Number.MAX_SAFE_INTEGER ? storedVersion : 0
  writeNecessaryCookie(CONSENT_VERSION_COOKIE, String(Math.max(Date.now(), previousVersion + 1)))
  if (ensureTrackingOwner()) writeNecessaryCookie(CONSENT_PENDING_COOKIE, '1')
  const signals = readConsentSignals()
  pushConsentUpdate(signals, readSavedConsentSignals())
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: signals }))
  return syncPendingConsent()
}

function clearMeasurementCookies(names: string[]) {
  if (typeof document === 'undefined') return
  const cookies = document.cookie.split(';').map((c) => c.trim().split('=')[0])
  const matched = cookies.filter((name) => names.includes(name) || (names.includes('_ga') && name.startsWith('_ga_')))
  // Tags can set domain cookies; remove both host-only and parent-domain variants.
  const labels = location.hostname.split('.')
  for (const name of matched) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
    for (let i = 0; i < labels.length - 1; i++) {
      document.cookie = `${name}=; Path=/; Domain=.${labels.slice(i).join('.')}; Max-Age=0; SameSite=Lax`
    }
  }
}

/** Inline Consent Mode v2 defaults — safe for Server Components / root layout. */
export function consentDefaultSnippet(): string {
  const denied = signalsFromState('denied')
  return `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',${JSON.stringify({
    ...denied,
    wait_for_update: 500,
  })});
(function(){
  try {
    var m = document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);
    var v = m && m[1];
    var pending = document.cookie.match(/(?:^|; )${CONSENT_PENDING_COOKIE}=1(?:;|$)/);
    var owner = document.cookie.match(/(?:^|; )${TRACKING_OWNER_COOKIE}=([a-f0-9-]{36})(?:;|$)/i);
    if (owner && (v === 'granted' || v === 'denied')) {
      var a = document.cookie.match(/(?:^|; )${ANALYTICS_CONSENT_COOKIE}=([^;]*)/);
      var av = a && (a[1] === 'granted' || a[1] === 'denied') ? a[1] : v;
      if (pending) {
        var ackMatch = document.cookie.match(/(?:^|; )${CONSENT_ACK_COOKIE}=([01]{2})(?:;|$)/);
        var ack = ackMatch ? ackMatch[1] : '00';
        v = v === 'granted' && ack.charAt(1) === '1' ? 'granted' : 'denied';
        av = av === 'granted' && ack.charAt(0) === '1' ? 'granted' : 'denied';
      }
      gtag('consent','update',{
        ad_storage:v, analytics_storage:av, ad_user_data:v, ad_personalization:v
      });
    }
  } catch(e){}
})();
`.trim()
}
