import type { Metadata } from 'next'
import { createSupabaseServer } from '@/lib/supabase/server'

type Props = {
  children: React.ReactNode
  params: Promise<{ category: string; subcategory: string }>
}

async function getSubcategoryName(
  parentSlug: string,
  subSlug: string
): Promise<{ subName: string; parentName: string } | null> {
  const supabase = await createSupabaseServer()
  const { data: sub } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', subSlug)
    .eq('parent_slug', parentSlug)
    .is('deleted_at', null)
    .maybeSingle()
  if (!sub) return null
  const { data: parent } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', parentSlug)
    .is('deleted_at', null)
    .maybeSingle()
  return {
    subName: sub.name,
    parentName: parent?.name ?? parentSlug,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, subcategory } = await params
  const names = await getSubcategoryName(category, subcategory)
  const title = names
    ? `${names.subName} | Favori Kozmetik`
    : 'Alt Kategori | Favori Kozmetik'
  const description = names
    ? `${names.parentName} - ${names.subName} ürünleri. Favori Kozmetik'te güvenle alışveriş yapın.`
    : 'Favori Kozmetik kategori sayfası.'

  return {
    title,
    description,
    alternates: { canonical: `/kategori/${category}/${subcategory}` },
  }
}

export default function SubcategoryLayout({ children }: Props) {
  return children
}
