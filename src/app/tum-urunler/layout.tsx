import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tüm Ürünler | Favori Kozmetik',
  description:
    'Favori Kozmetik tüm ürün kataloğu. Protez tırnak, saç bakımı, kişisel bakım, ipek kirpik ve kuaför malzemeleri.',
  alternates: { canonical: '/tum-urunler' },
}

export default function TumUrunlerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
