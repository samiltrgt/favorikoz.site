import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: true, googleBot: { index: false, follow: true } } }

export const dynamic = 'force-dynamic'

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
