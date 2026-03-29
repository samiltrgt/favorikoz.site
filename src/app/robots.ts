import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getSiteUrl } from '@/lib/site-url'

export default async function robots(): Promise<MetadataRoute.Robots> {
  let baseUrl = getSiteUrl()
  try {
    const headersList = await headers()
    const host = headersList.get('host')
    const proto = headersList.get('x-forwarded-proto') ?? 'https'
    if (host) baseUrl = `${proto === 'https' ? 'https' : 'http'}://${host}`
  } catch {
    // fallback env
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/checkout', '/payment/', '/_next/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
