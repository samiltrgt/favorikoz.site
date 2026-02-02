import type { Metadata } from 'next'
import { createSupabaseServer } from '@/lib/supabase/server'

type Props = { children: React.ReactNode; params: Promise<{ category: string }> }

async function getCategoryName(slug: string): Promise<string | null> {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', slug)
    .is('deleted_at', null)
    .is('parent_slug', null)
    .maybeSingle()
  return data?.name ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const name = await getCategoryName(category)
  const title = name ? `${name} | Favori Kozmetik` : 'Kategori | Favori Kozmetik'
  const description = name
    ? `${name} kategorisindeki ürünler. Favori Kozmetik'te güvenle alışveriş yapın.`
    : 'Favori Kozmetik kategori sayfası.'

  return {
    title,
    description,
    alternates: { canonical: `/kategori/${category}` },
  }
}

export default function CategoryLayout({ children }: Props) {
  return children
}
