import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  title: 'Giriş Yap | Favori Kozmetik',
  description: 'Favori Kozmetik hesabınıza giriş yapın.',
  alternates: { canonical: '/giris' },
}

export default function GirisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
