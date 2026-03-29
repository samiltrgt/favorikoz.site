/**
 * Canonical public site origin (no trailing slash).
 * Prefer NEXT_PUBLIC_BASE_URL (production custom domain). Used for metadata, sitemap, JSON-LD.
 */
const PRODUCTION_FALLBACK = 'https://www.favorikozmetik.com'

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel}`.replace(/\/$/, '')
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000'
  return PRODUCTION_FALLBACK
}
