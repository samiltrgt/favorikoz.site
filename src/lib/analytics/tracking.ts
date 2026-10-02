/**
 * Reklam tıklama kimlikleri — 90 gün birinci taraf çerez.
 * Checkout'ta siparişe yazılır (EMQ yükseltir).
 */

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
  try {
    const raw = readCookie(TRACKING_COOKIE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as TrackingIds
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function captureTrackingFromUrl(search?: string): TrackingIds {
  if (typeof window === 'undefined') return readStoredTracking()
  const params = new URLSearchParams(search ?? window.location.search)
  const prev = readStoredTracking()
  const next: TrackingIds = { ...prev }
  let changed = false

  for (const key of CLICK_KEYS) {
    const val = params.get(key)
    if (val) {
      next[key] = val
      changed = true
    }
  }

  if (changed) {
    writeCookie(TRACKING_COOKIE, JSON.stringify(next), TRACKING_MAX_AGE_DAYS)
  }
  return next
}

/** Meta _fbp çerezi (Pixel set eder; yoksa undefined) */
export function readFbp(): string | undefined {
  return readCookie('_fbp') || undefined
}

/**
 * Meta _fbc çerezi. Yoksa ama fbclid varsa: fb.1.{unix_ms}.{fbclid}
 */
export function readOrBuildFbc(fbclid?: string): string | undefined {
  const existing = readCookie('_fbc')
  if (existing) return existing
  const clickId = fbclid || readStoredTracking().fbclid
  if (!clickId) return undefined
  return `fb.1.${Date.now()}.${clickId}`
}

/** Checkout → POST /api/payment tracking gövdesi */
export function getCheckoutTrackingPayload(): TrackingIds & {
  fbp?: string
  fbc?: string
} {
  const ids = captureTrackingFromUrl()
  return {
    ...ids,
    fbp: readFbp(),
    fbc: readOrBuildFbc(ids.fbclid),
  }
}
