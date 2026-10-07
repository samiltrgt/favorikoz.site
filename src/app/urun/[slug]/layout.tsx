import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/get-product-by-slug'
import { getSiteUrl } from '@/lib/site-url'
import { getProductSeo, productJsonLd, productBreadcrumbJsonLd, serializeProductJsonLd } from '@/lib/product-seo'
import { getProductBreadcrumbs, getProductSeoReviews } from '@/lib/product-seo-server'

export const revalidate = 60

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const siteUrl = getSiteUrl()
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Ürün Bulunamadı | Favori Kozmetik', robots: { index: false, follow: true } }
  const { title, description } = getProductSeo(product)
  const canonicalUrl = `${siteUrl}/urun/${encodeURIComponent(product.slug)}`
  return {
    title: { absolute: title }, description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, url: canonicalUrl, type: 'website', images: product.image ? [{ url: product.image, alt: product.name }] : undefined },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function ProductLayout({ children, params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()
  const [breadcrumbs, reviews] = await Promise.all([getProductBreadcrumbs(product), getProductSeoReviews(product.id).catch(() => [])])
  const siteUrl = getSiteUrl()
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeProductJsonLd(productJsonLd(product, reviews, siteUrl)) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeProductJsonLd(productBreadcrumbJsonLd(breadcrumbs, siteUrl)) }} />
    {children}
  </>
}
