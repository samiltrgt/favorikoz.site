import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

const siteUrl = getSiteUrl()

async function getProductBySlug(slug: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, brand, description, image, price, original_price, in_stock, category_slug, subcategory_slug, rating, reviews_count')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) return null
  const price = (data.price / 100) / 10
  const originalPrice = data.original_price ? (data.original_price / 100) / 10 : null
  return { ...data, price, original_price: originalPrice }
}

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

async function getSubcategoryName(parentSlug: string, subSlug: string): Promise<string | null> {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', subSlug)
    .eq('parent_slug', parentSlug)
    .is('deleted_at', null)
    .maybeSingle()
  return data?.name ?? null
}

type ReviewRow = {
  rating: number
  comment: string
  created_at: string
  guest_name: string | null
  profiles: { name: string } | { name: string }[] | null
}

async function getProductReviews(productId: string): Promise<{ author: string; datePublished: string; reviewBody: string; ratingValue: number }[]> {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from('reviews')
    .select('rating, comment, created_at, guest_name, profiles:user_id(name)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(10)
  if (!data?.length) return []
  return (data as ReviewRow[]).map((r) => {
    const profileName = Array.isArray(r.profiles) ? r.profiles[0]?.name : (r.profiles as { name: string } | null)?.name
    return {
      author: profileName || r.guest_name || 'Anonim',
      datePublished: new Date(r.created_at).toISOString().slice(0, 10),
      reviewBody: r.comment || '',
      ratingValue: r.rating,
    }
  })
}

function productJsonLd(
  product: {
    name: string
    description: string | null
    image: string | null
    price: number
    slug: string
    in_stock: boolean
    brand?: string | null
    rating?: number
    reviews_count?: number
  },
  reviews: { author: string; datePublished: string; reviewBody: string; ratingValue: number }[]
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    image: product.image ? [product.image] : [],
    url: `${siteUrl}/urun/${product.slug}`,
    ...(product.brand ? { brand: { '@type': 'Brand' as const, name: product.brand } } : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'TRY',
      priceValidUntil: (() => {
        const d = new Date()
        d.setFullYear(d.getFullYear() + 1)
        return d.toISOString().slice(0, 10)
      })(),
      availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }
  const hasReviews =
    typeof product.rating === 'number' &&
    typeof product.reviews_count === 'number' &&
    product.reviews_count > 0
  schema.aggregateRating = {
    '@type': 'AggregateRating',
    ratingValue: hasReviews ? product.rating! : 0,
    reviewCount: hasReviews ? product.reviews_count! : 0,
    bestRating: 5,
  }
  if (reviews.length > 0) {
    schema.review = reviews.map((r) => ({
      '@type': 'Review' as const,
      author: { '@type': 'Person' as const, name: r.author },
      datePublished: r.datePublished,
      reviewBody: r.reviewBody,
      reviewRating: {
        '@type': 'Rating' as const,
        ratingValue: r.ratingValue,
        bestRating: 5,
      },
    }))
  }
  return schema
}

function breadcrumbJsonLd(opts: {
  productSlug: string
  productName: string
  categorySlug: string | null
  categoryName: string | null
  subcategorySlug: string | null
  subcategoryName: string | null
}) {
  const { productSlug, productName, categorySlug, categoryName, subcategorySlug, subcategoryName } = opts
  const items: { '@type': 'ListItem'; position: number; name: string; item: string }[] = [
    { '@type': 'ListItem', position: 1, name: 'Anasayfa', item: siteUrl },
  ]
  let pos = 2
  if (categorySlug && categoryName) {
    items.push({
      '@type': 'ListItem',
      position: pos++,
      name: categoryName,
      item: `${siteUrl}/kategori/${categorySlug}`,
    })
  }
  if (subcategorySlug && subcategoryName) {
    items.push({
      '@type': 'ListItem',
      position: pos++,
      name: subcategoryName,
      item: `${siteUrl}/kategori/${categorySlug}/${subcategorySlug}`,
    })
  }
  items.push({
    '@type': 'ListItem',
    position: pos,
    name: productName,
    item: `${siteUrl}/urun/${productSlug}`,
  })
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) {
    return {
      title: 'Ürün Bulunamadı | Favori Kozmetik',
      alternates: { canonical: `${siteUrl}/urun/${slug}` },
      robots: { index: false, follow: true },
    }
  }

  const title = `${product.name} | Favori Kozmetik`
  const description =
    (product.description && product.description.slice(0, 160)) ||
    `${product.name}${product.brand ? ` - ${product.brand}` : ''}. Favori Kozmetik'te güvenle alışveriş yapın.`
  const canonicalUrl = `${siteUrl}/urun/${product.slug}`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
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
  if (!product) notFound()
  const [categoryName, subcategoryName, reviews] = await Promise.all([
    product.category_slug ? getCategoryName(product.category_slug) : Promise.resolve(null),
    product.category_slug && product.subcategory_slug
      ? getSubcategoryName(product.category_slug, product.subcategory_slug)
      : Promise.resolve(null),
    getProductReviews(product.id),
  ])

  return (
    <>
      {product && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(productJsonLd(product, reviews)),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                breadcrumbJsonLd({
                  productSlug: product.slug,
                  productName: product.name,
                  categorySlug: product.category_slug ?? null,
                  categoryName,
                  subcategorySlug: product.subcategory_slug ?? null,
                  subcategoryName,
                })
              ),
            }}
          />
        </>
      )}
      {children}
    </>
  )
}
