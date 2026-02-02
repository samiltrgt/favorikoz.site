import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export default async function robots(): Promise<MetadataRoute.Robots> {
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.favorikozmetik.com'
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
      disallow: ['/admin/', '/api/', '/checkout', '/payment/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
