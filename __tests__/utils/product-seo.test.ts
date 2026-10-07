import { productJsonLd, validGtin, serializeProductJsonLd, productBreadcrumbJsonLd } from '@/lib/product-seo'
import type { ProductBySlug } from '@/lib/get-product-by-slug'
import { productSeoOverrides } from '@/data/product-seo'
import { getProductSeo } from '@/lib/product-seo'

const product: ProductBySlug = { id: 'product-1', slug: 'test-product', name: 'Test ürün', brand: 'Marka', description: 'Açıklama', image: 'https://example.com/image.jpg', images: [], barcode: '4006381333931', price: 129.95, original_price: null, in_stock: false, stock_quantity: 0, category_slug: 'tirnak', subcategory_slug: null, rating: 4.6, reviews_count: 154 }

describe('Product structured data', () => {
  it('does not treat imported product counters as customer reviews', () => {
    const schema = productJsonLd(product, [], 'https://shop.example')
    expect(schema).not.toHaveProperty('aggregateRating')
    expect(schema).not.toHaveProperty('review')
    expect(schema.offers).toMatchObject({ price: '129.95', availability: 'https://schema.org/OutOfStock', url: 'https://shop.example/urun/test-product' })
    expect(schema.offers).not.toHaveProperty('priceValidUntil')
  })
  it('averages actual valid reviews and excludes invalid reviews', () => {
    const reviews = [5, 3, 0, 8].map(ratingValue => ({ author: 'Müşteri', reviewBody: 'Ürün değerlendirmesi', datePublished: '2026-01-01', ratingValue }))
    expect(productJsonLd(product, reviews, 'https://shop.example').aggregateRating).toMatchObject({ ratingValue: 4, reviewCount: 2 })
  })
  it('only sends checksum-valid GTIN identifiers', () => {
    expect(validGtin('4006381333931')).toEqual({ gtin13: '4006381333931' })
    expect(validGtin('4006381333932')).toEqual({})
    expect(validGtin('8690201381729-87')).toEqual({})
  })
  it('escapes script breakout without corrupting JSON contents', () => {
    const input = { name: '</script><script>alert(1)</script>' }
    const output = serializeProductJsonLd(input)
    expect(output).not.toContain('</script>')
    expect(JSON.parse(output)).toEqual(input)
  })
  it('uses exactly the displayed breadcrumb paths in structured data', () => {
    const breadcrumbs = [{ name: 'Anasayfa', href: '/' }, { name: 'Tırnak', href: '/kategori/tirnak' }, { name: 'Ürün', href: '/urun/test-product' }]
    expect(productBreadcrumbJsonLd(breadcrumbs, 'https://shop.example').itemListElement.map(item => item.item)).toEqual(breadcrumbs.map(item => `https://shop.example${item.href}`))
  })
  it('ships20 individual product guides and ignores mismatched live product names', () => {
    const entries = Object.entries(productSeoOverrides)
    expect(entries).toHaveLength(20)
    expect(new Set(entries.map(([, value]) => value.paragraphs.join(' '))).size).toBe(20)
    for (const [slug, value] of entries) {
      expect(value.paragraphs.length).toBeGreaterThanOrEqual(2)
      expect(value.facts.length).toBeGreaterThanOrEqual(2)
      expect(getProductSeo({ ...product, slug, name: value.expectedName }).content).toBe(value)
      expect(getProductSeo({ ...product, slug, name: 'Renamed product' }).content).toBeUndefined()
    }
  })
})
