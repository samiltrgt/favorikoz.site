import type { TrackingIdentity } from './schema'
import { createHash } from 'crypto'

function cookie(request: Request, name: string): string | undefined {
  const value = request.headers.get('cookie')?.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`))?.slice(name.length + 1)
  try { return value ? decodeURIComponent(value) : undefined } catch { return undefined }
}
function bounded(value: unknown, max = 256): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= max && !/[\x00-\x1f]/.test(value) ? value : undefined
}
export function trackingOwnerFromRequest(request: Request): string | undefined {
  const owner = cookie(request, 'fk_tracking_owner')
  return owner && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(owner) ? createHash('sha256').update(owner.toLowerCase()).digest('hex') : undefined
}
export function consentVersionFromRequest(request: Request): number | undefined {
  const raw = cookie(request, 'fk_consent_version')
  const version = raw && /^\d{1,16}$/.test(raw) ? Number(raw) : NaN
  return Number.isSafeInteger(version) && version > 0 ? version : undefined
}
export function consentFromRequest(request: Request) {
  return { marketing: cookie(request, 'fk_consent') === 'granted', analytics: (cookie(request, 'fk_consent_analytics') || cookie(request, 'fk_consent')) === 'granted' }
}
export function explicitConsentCookiesValid(request: Request): boolean {
  const marketing = cookie(request, 'fk_consent'), analytics = cookie(request, 'fk_consent_analytics')
  return (marketing === 'granted' || marketing === 'denied') && (analytics === undefined || analytics === 'granted' || analytics === 'denied')
}

/** User ID is supplied only after Supabase auth.getUser() verification. */
export function captureOrderTracking(request: Request, input: unknown, verifiedUserId?: string | null): TrackingIdentity {
  const owner = trackingOwnerFromRequest(request)
  const version = consentVersionFromRequest(request)
  const requested = consentFromRequest(request)
  const approved = !!owner && !!version && requested.marketing
  const analytics = !!owner && !!version && requested.analytics
  const consent = { analytics, marketing: approved }
  const ownerData = owner && version ? { consent_owner: owner, consent_version: version } : {}
  if (!approved && !analytics) return { consent, ...ownerData }
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
  if (!body.client_id && body.google_client_id) body.client_id = body.google_client_id
  if (!body.session_id && body.google_session_id) body.session_id = body.google_session_id
  const result: TrackingIdentity = { consent, ...ownerData, captured_at: new Date().toISOString() }
  for (const key of ['fbclid', 'gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'client_id', 'session_id']) {
    if (!approved && !['client_id', 'session_id'].includes(key)) continue
    if (!analytics && ['client_id', 'session_id'].includes(key)) continue
    const value = bounded(body[key])
    if (value) result[key] = value
  }
  for (const key of ['fbp', 'fbc']) {
    if (!approved) continue
    const value = bounded(cookie(request, `_${key}`) || body[key])
    if (value && /^fb\.\d\.\d{10,13}\.[\w.-]+$/.test(value)) result[key] = value
  }
  if (result.client_id && !/^\d+\.\d+$/.test(String(result.client_id))) delete result.client_id
  if (result.session_id && !/^[1-9]\d*$/.test(String(result.session_id))) delete result.session_id
  // Browser GA identifiers, never substitute an email or order number for client_id.
  if (analytics && !result.client_id) {
    const ga = cookie(request, '_ga')?.match(/^GA\d\.\d\.(\d+\.\d+)$/)
    if (ga) result.client_id = ga[1]
  }
  if (approved && verifiedUserId) result.external_id = verifiedUserId
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
  const ua = bounded(request.headers.get('user-agent'), 512)
  if (approved && ip && /^[\da-fA-F:.]{3,64}$/.test(ip)) result.ip = ip
  if (approved && ua) result.user_agent = ua
  const rawSource = body.eventSourceUrl || body.event_source_url || body.source_url
  if (typeof rawSource === 'string' && rawSource.length < 2048) {
    try {
      const source = new URL(rawSource)
      if (source.origin === new URL(request.url).origin) { source.search = ''; source.hash = ''; result.source_url = source.href }
    } catch { /* Invalid client URL is omitted. */ }
  }
  return result
}
