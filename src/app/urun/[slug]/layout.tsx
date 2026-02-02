import type { Metadata } from 'next'
import { createSupabaseServer } from '@/lib/supabase/server'

const BASE_URL = 'https://www.favorikozmetik.com'

async function getProductBySlug(slug: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, brand, description, image, price, original_price, in_stock, category_slug')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) return null
  const price = (data.price / 100) / 10
  const originalPrice = data.original_price ? (data.original_price / 100) / 10 : null
  return { ...data, price, original_price: originalPrice }
}

function productJsonLd(product: {
  name: string
  description: string | null
  image: string | null
  price: number
  slug: string
  in_stock: boolean
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    image: product.image ? [product.image] : [],
    url: `${BASE_URL}/urun/${product.slug}`,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'TRY',
      availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }
}

function breadcrumbJsonLd(slug: string, name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Anasayfa', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tüm Ürünler', item: `${BASE_URL}/tum-urunler` },
      { '@type': 'ListItem', position: 3, name, item: `${BASE_URL}/urun/${slug}` },
    ],
  }
}

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Ürün Bulunamadı | Favori Kozmetik' }

  const title = `${product.name} | Favori Kozmetik`
  const description =
    (product.description && product.description.slice(0, 160)) ||
    `${product.name}${product.brand ? ` - ${product.brand}` : ''}. Favori Kozmetik'te güvenle alışveriş yapın.`
  const url = `/urun/${product.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: product.image ? [{ url: product.image, alt: product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ProductLayout({ children, params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  return (
    <>
      {product && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(productJsonLd(product)),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(breadcrumbJsonLd(product.slug, product.name)),
            }}
          />
        </>
      )}
      {children}
    </>
  )
}
