/**
 * KVKK / Consent Mode v2 — çerez tercihleri
 * Varsayılan: denied. Onay alınmadan pazarlama etiketleri tetiklenmez (GTM Consent).
 */

export const CONSENT_COOKIE = 'fk_consent'
export const CONSENT_MAX_AGE_DAYS = 365

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

export function writeConsentCookie(state: 'granted' | 'denied') {
  if (typeof document === 'undefined') return
  const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${state}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

/** dataLayer + gtag consent update (GTM dinler) */
export function pushConsentUpdate(state: 'granted' | 'denied') {
  if (typeof window === 'undefined') return
  const signals = signalsFromState(state)
  const w = window as Window & {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
  w.dataLayer = w.dataLayer || []
  if (typeof w.gtag === 'function') {
    w.gtag('consent', 'update', signals)
  } else {
    // gtag henüz yoksa dataLayer üzerinden (GTM Consent Initialization okur)
    w.dataLayer.push(['consent', 'update', signals])
  }
  w.dataLayer.push({
    event: 'consent_update',
    ...signals,
  })
}

export function applyConsentChoice(state: 'granted' | 'denied') {
  writeConsentCookie(state)
  pushConsentUpdate(state)
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
    if (v === 'granted' || v === 'denied') {
      gtag('consent','update',{
        ad_storage:v, analytics_storage:v, ad_user_data:v, ad_personalization:v
      });
    }
  } catch(e){}
})();
`.trim()
}
