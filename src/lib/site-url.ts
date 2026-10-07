/** Public canonical origin. Request and preview hosts never become canonical URLs. */
export function getSiteUrl(): string {
  const fallback = 'https://favorikozmetik.com'
  try {
    const url = new URL(process.env.NEXT_PUBLIC_BASE_URL?.trim() || fallback)
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.hostname === 'localhost' || url.hostname.endsWith('.vercel.app') ||
      /^[\d.]+$/.test(url.hostname) || !url.hostname.includes('.')) return fallback
    // The production www alias redirects to the apex; canonical URLs must resolve directly.
    return url.hostname === 'www.favorikozmetik.com' ? fallback : url.origin
  } catch { return fallback }
}

export function isPreviewDeployment(): boolean {
  return Boolean(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production')
}
