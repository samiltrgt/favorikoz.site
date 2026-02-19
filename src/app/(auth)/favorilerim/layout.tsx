import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Favorilerim | Favori Kozmetik',
  description: 'Favori Kozmetik favori ürün listeniz.',
  robots: { index: false, follow: true },
}

export default function FavorilerimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
