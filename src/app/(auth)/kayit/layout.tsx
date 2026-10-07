import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  title: 'Üye Ol | Favori Kozmetik',
  description: 'Favori Kozmetik üyeliği oluşturun ve alışverişe başlayın.',
  alternates: { canonical: '/kayit' },
}

export default function KayitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
