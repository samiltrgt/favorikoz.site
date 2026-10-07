import type { MetadataRoute } from 'next'
import { getSiteUrl, isPreviewDeployment } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment()) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
