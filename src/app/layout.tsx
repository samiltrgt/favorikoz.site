import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

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
  metadataBase: new URL('https://www.favorikozmetik.com'),
  alternates: {
    canonical: 'https://www.favorikozmetik.com/',
  },
  openGraph: {
    title: 'Favori Kozmetik - Premium Kozmetik Ürünleri',
    description: 'Favori Kozmetik ile güzelliğinizi keşfedin. Protez tırnak, kalıcı makyaj, kişisel bakım ve daha fazlası için güvenilir adresiniz.',
    url: 'https://www.favorikozmetik.com',
    siteName: 'Favori Kozmetik',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Favori Kozmetik - Premium Kozmetik Ürünleri',
    description: 'Favori Kozmetik ile güzelliğinizi keşfedin. Protez tırnak, kalıcı makyaj, kişisel bakım ve daha fazlası için güvenilir adresiniz.',
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
      '@id': 'https://www.favorikozmetik.com/#organization',
      name: 'Favori Kozmetik',
      url: 'https://www.favorikozmetik.com',
      logo: { '@type': 'ImageObject', url: 'https://www.favorikozmetik.com/logo.png' },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.favorikozmetik.com/#website',
      url: 'https://www.favorikozmetik.com',
      name: 'Favori Kozmetik',
      publisher: { '@id': 'https://www.favorikozmetik.com/#organization' },
      inLanguage: 'tr-TR',
    },
  ],
}

function SupabasePreconnect() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const origin = url ? new URL(url).origin : null
  if (!origin) return null
  return <link rel="preconnect" href={origin} />
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <SupabasePreconnect />
      </head>
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
