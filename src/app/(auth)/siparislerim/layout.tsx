import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Siparişlerim | Favori Kozmetik',
  description: 'Favori Kozmetik sipariş geçmişiniz ve takip.',
  robots: { index: false, follow: true },
}

export default function SiparislerimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
