import type { ProductBySlug } from '@/lib/get-product-by-slug'
import { productSeoOverrides } from '@/data/product-seo'
import { validGtin as catalogGtin } from '@/lib/analytics/catalog'

export type ProductBreadcrumb = { name: string; href: string }
export type ProductReview = { id?: string; verified?: boolean; author: string; datePublished: string; reviewBody: string; ratingValue: number }

export function plainProductText(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function getProductSeo(product: ProductBySlug) {
  const candidate = productSeoOverrides[product.slug]
  const override = candidate?.expectedName === product.name ? candidate : undefined
  const description = override?.description || plainProductText(product.description || '') ||
    `${product.name}${product.brand && !product.name.toLocaleLowerCase('tr').includes(product.brand.toLocaleLowerCase('tr')) ? `, ${product.brand}` : ''}. Ürün bilgilerini, güncel fiyatını ve stok durumunu Favori Kozmetik'te inceleyin.`
  return { title: override?.title || `${product.name} | Favori Kozmetik`, description: description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description, content: override }
}

export function validGtin(barcode: string | null): Record<string, string> {
  const value = catalogGtin(barcode)
  if (!value) return {}
  return { [`gtin${value.length}`]: value }
}

export function validProductReviews(reviews: ProductReview[]) {
  return reviews.filter(r => Number.isFinite(r.ratingValue) && r.ratingValue >= 1 && r.ratingValue <= 5 && r.reviewBody.trim() && r.author.trim() && !Number.isNaN(Date.parse(r.datePublished)))
}

export function productJsonLd(product: ProductBySlug, reviews: ProductReview[], siteUrl: string) {
  const validReviews = validProductReviews(reviews)
  const url = `${siteUrl}/urun/${encodeURIComponent(product.slug)}`
  const images = Array.from(new Set([product.image, ...(product.images || [])].flatMap(image => {
    if (!image) return []
    try { const url = new URL(image, siteUrl); return ['https:', 'http:'].includes(url.protocol) ? [url.href] : [] } catch { return [] }
  })))
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name,
    description: getProductSeo(product).content?.paragraphs.join(' ') || plainProductText(product.description || getProductSeo(product).description),
    ...(images.length ? { image: images } : {}), url, sku: product.id,
    ...validGtin(product.barcode),
    ...(product.brand?.trim() ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(Number.isFinite(product.price) && product.price > 0 ? { offers: {
      '@type': 'Offer', url, price: product.price.toFixed(2), priceCurrency: 'TRY',
      availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    } } : {}),
    ...(validReviews.length ? {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: Number((validReviews.reduce((sum, r) => sum + r.ratingValue, 0) / validReviews.length).toFixed(2)), reviewCount: validReviews.length, bestRating: 5, worstRating: 1 },
      review: validReviews.slice(0, 10).map(r => ({ '@type': 'Review', author: { '@type': 'Person', name: r.author }, datePublished: r.datePublished, reviewBody: r.reviewBody, reviewRating: { '@type': 'Rating', ratingValue: r.ratingValue, bestRating: 5, worstRating: 1 } })),
    } : {}),
  }
}

export function productBreadcrumbJsonLd(breadcrumbs: ProductBreadcrumb[], siteUrl: string) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: `${siteUrl}${item.href}` })) }
}

export function serializeProductJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}
