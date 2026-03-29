import type { Metadata } from 'next'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

const siteUrl = getSiteUrl()
const ITEMLIST_LIMIT = 50

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

export default async function CategoryLayout({ children, params }: Props) {
  const { category: categorySlug } = await params

  const supabase = await createSupabaseServer()
  const { data: products } = await supabase
    .from('products')
    .select('slug, name')
    .eq('category_slug', categorySlug)
    .is('subcategory_slug', null)
    .is('deleted_at', null)
    .eq('in_stock', true)
    .gt('stock_quantity', 0)
    .limit(ITEMLIST_LIMIT)

  const categoryName = await getCategoryName(categorySlug)
  const itemListJsonLd =
    products && products.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: products.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.name,
            url: `${siteUrl}/urun/${p.slug}`,
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
      {/* İlk HTML'de ürün linkleri: Google'ın sayfayı "ince içerik" saymaması ve dizine eklemesi için */}
      {products && products.length > 0 && (
        <div className="sr-only" aria-hidden="false">
          <h2>{categoryName || categorySlug} kategorisindeki ürünler</h2>
          <ul>
            {products.map((p) => (
              <li key={p.slug}>
                <a href={`${siteUrl}/urun/${p.slug}`}>{p.name}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </>
  )
}
