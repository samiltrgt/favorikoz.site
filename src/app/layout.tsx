import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { Onest } from 'next/font/google'
import { GoogleTagManager } from '@next/third-parties/google'
import { getSiteUrl } from '@/lib/site-url'
import { getPublicCategories } from '@/lib/categories-server'
import { CategoriesProvider } from '@/components/categories-provider'
import { SmoothScroll } from '@/components/smooth-scroll'
import ConsentBanner from '@/components/consent-banner'
import { consentDefaultSnippet } from '@/lib/analytics/consent'
import AnalyticsRouteListener from '@/components/analytics-route-listener'
import type { BrowserTagConfig } from '@/lib/analytics/browser-tags'
import './globals.css'

const onest = Onest({
  subsets: ['latin', 'latin-ext'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-onest',
  fallback: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
})

const siteUrl = getSiteUrl()
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim() || 'GTM-57BVM8H7'
const browserTagConfig: BrowserTagConfig = {
  mode: process.env.NEXT_PUBLIC_TRACKING_MODE === 'gtm' ? 'gtm' : 'direct',
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || process.env.META_PIXEL_ID?.trim(),
  ga4MeasurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim(),
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim(),
  googleAdsConversionLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim(),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'Favori Kozmetik - Premium Kozmetik Ürünleri',
  description: 'Favori Kozmetik ile güzelliğinizi keşfedin. Protez tırnak, kalıcı makyaj, kişisel bakım ve daha fazlası için güvenilir adresiniz.',
  keywords: 'kozmetik, protez tırnak, kalıcı makyaj, kişisel bakım, makyaj, saç bakımı',
  authors: [{ name: 'Favori Kozmetik' }],
  creator: 'Favori Kozmetik',
  publisher: 'Favori Kozmetik',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Favori Kozmetik - Premium Kozmetik Ürünleri',
    description: 'Favori Kozmetik ile güzelliğinizi keşfedin. Protez tırnak, kalıcı makyaj, kişisel bakım ve daha fazlası için güvenilir adresiniz.',
    url: siteUrl,
    siteName: 'Favori Kozmetik',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'Favori Kozmetik' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Favori Kozmetik - Premium Kozmetik Ürünleri',
    description: 'Favori Kozmetik ile güzelliğinizi keşfedin. Protez tırnak, kalıcı makyaj, kişisel bakım ve daha fazlası için güvenilir adresiniz.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Favori Kozmetik',
      url: siteUrl,
      logo: { '@type': 'ImageObject', url: `${siteUrl}/logo.png` },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Favori Kozmetik',
      publisher: { '@id': `${siteUrl}/#organization` },
      inLanguage: 'tr-TR',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/tum-urunler?search={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let menuCategories: Awaited<ReturnType<typeof getPublicCategories>>['tree'] = []
  try {
    const data = await getPublicCategories()
    menuCategories = data.tree
  } catch (error) {
    console.error('Failed to load menu categories:', error)
  }

  return (
    <html lang="tr" className={onest.variable}>
      <head>
        {/* Consent Mode v2 varsayılan DENIED — GTM'den ÖNCE */}
        <script
          dangerouslySetInnerHTML={{ __html: consentDefaultSnippet() }}
        />
        <script dangerouslySetInnerHTML={{ __html: `window.fkTagConfig=${JSON.stringify(browserTagConfig).replace(/</g, '\\u003c')};` }} />
      </head>
      <body className={onest.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SmoothScroll>
          <CategoriesProvider categories={menuCategories}>{children}</CategoriesProvider>
        </SmoothScroll>
        <Suspense fallback={null}>
          <AnalyticsRouteListener />
        </Suspense>
        <ConsentBanner />
      </body>
      {browserTagConfig.mode === 'gtm' && <GoogleTagManager gtmId={GTM_ID} />}
    </html>
  )
}
