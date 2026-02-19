import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hesabım | Favori Kozmetik',
  description: 'Favori Kozmetik hesap bilgileriniz ve siparişleriniz.',
  robots: { index: false, follow: true },
}

export default function HesabimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
