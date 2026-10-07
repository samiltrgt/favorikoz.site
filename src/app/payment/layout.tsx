import type { Metadata } from 'next'
import { Suspense } from 'react'
export const metadata: Metadata = { robots: { index: false, follow: true, googleBot: { index: false, follow: true } } }
export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="p-6 text-center">Ödeme sonucu yükleniyor…</p>}>{children}</Suspense>
}

