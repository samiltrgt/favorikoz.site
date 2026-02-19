import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Şifre Yenile | Favori Kozmetik',
  description: 'Favori Kozmetik hesap şifrenizi güncelleyin.',
  robots: { index: false, follow: true },
}

export default function SifreYenileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
