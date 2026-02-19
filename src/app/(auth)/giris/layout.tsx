import type { Metadata } from 'next'

export const metadata: Metadata = {
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
