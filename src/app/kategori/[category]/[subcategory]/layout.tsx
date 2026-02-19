import type { Metadata } from 'next'
import { createSupabaseServer } from '@/lib/supabase/server'

const BASE_URL = 'https://www.favorikozmetik.com'
const ITEMLIST_LIMIT = 50

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

export default async function SubcategoryLayout({ children, params }: Props) {
  const { category, subcategory } = await params

  const supabase = await createSupabaseServer()
  const { data: products } = await supabase
    .from('products')
    .select('slug, name')
    .eq('category_slug', category)
    .eq('subcategory_slug', subcategory)
    .is('deleted_at', null)
    .eq('in_stock', true)
    .gt('stock_quantity', 0)
    .limit(ITEMLIST_LIMIT)

  const names = await getSubcategoryName(category, subcategory)
  const itemListJsonLd =
    products && products.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: products.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.name,
            url: `${BASE_URL}/urun/${p.slug}`,
          })),
        }
      : null

  return (
    <>
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      {/* İlk HTML'de ürün linkleri: Google'ın sayfayı dizine eklemesi için */}
      {products && products.length > 0 && (
        <div className="sr-only" aria-hidden="false">
          <h2>
            {names ? `${names.parentName} - ${names.subName} ürünleri` : `${category} / ${subcategory}`}
          </h2>
          <ul>
            {products.map((p) => (
              <li key={p.slug}>
                <a href={`${BASE_URL}/urun/${p.slug}`}>{p.name}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </>
  )
}
