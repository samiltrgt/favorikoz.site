import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  title: 'Şifremi Unuttum | Favori Kozmetik',
  description: 'Favori Kozmetik hesap şifrenizi sıfırlayın.',
  alternates: { canonical: '/sifremi-unuttum' },
}

export default function SifremiUnuttumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
