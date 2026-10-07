import { cache } from 'react'
import { createSupabaseAnon } from '@/lib/supabase/server'
import type { ProductBySlug } from '@/lib/get-product-by-slug'
import type { ProductBreadcrumb, ProductReview } from '@/lib/product-seo'
import { validProductReviews } from '@/lib/product-seo'

type CategoryRow = { slug: string; name: string; parent_slug: string | null }

const getProductCategories = cache(async (): Promise<CategoryRow[]> => {
  const { data, error } = await createSupabaseAnon().from('categories').select('slug, name, parent_slug').is('deleted_at', null)
  if (error) throw new Error('Product category lookup failed')
  return data || []
})

export async function getProductBreadcrumbs(product: ProductBySlug): Promise<ProductBreadcrumb[]> {
  const categories = await getProductCategories()
  const bySlug = new Map(categories.map(category => [category.slug, category]))
  const path: CategoryRow[] = []
  const seen = new Set<string>()
  let current = bySlug.get(product.subcategory_slug || product.category_slug || '')
  while (current && !seen.has(current.slug)) {
    seen.add(current.slug)
    path.unshift(current)
    current = current.parent_slug ? bySlug.get(current.parent_slug) : undefined
  }
  // Never produce an orphan/category-cycle URL that the router cannot resolve.
  const validPath = path.length && !path[0].parent_slug ? path : []
  const breadcrumbs = [{ name: 'Anasayfa', href: '/' }]
  if (!validPath.length) breadcrumbs.push({ name: 'Tüm Ürünler', href: '/tum-urunler' })
  validPath.forEach((category, index) => breadcrumbs.push({ name: category.name, href: `/kategori/${validPath.slice(0, index + 1).map(item => encodeURIComponent(item.slug)).join('/')}` }))
  breadcrumbs.push({ name: product.name, href: `/urun/${encodeURIComponent(product.slug)}` })
  return breadcrumbs
}

export const getProductSeoReviews = cache(async (productId: string): Promise<ProductReview[]> => {
  const supabase = createSupabaseAnon()
  const rows: ProductReview[] = []
  let total: number | null = null
  for (let offset = 0; ;) {
    const { data, error, count } = await supabase.from('reviews').select('id, verified, rating, comment, created_at, guest_name, profiles:user_id(name)', offset === 0 ? { count: 'exact' } : {}).eq('product_id', productId).order('created_at', { ascending: false }).order('id', { ascending: true }).range(offset, offset + 499)
    if (error) throw new Error('Product reviews lookup failed')
    for (const review of data || []) {
      const profile = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles
      rows.push({ id: review.id, verified: review.verified === true, author: profile?.name || review.guest_name || 'Anonim', datePublished: review.created_at, reviewBody: review.comment || '', ratingValue: review.rating })
    }
    if (offset === 0) total = count
    offset += data?.length || 0
    if (!data?.length || (total !== null && offset >= total)) return validProductReviews(rows)
  }
})

export async function getRelatedProducts(product: ProductBySlug): Promise<{ slug: string; name: string }[]> {
  if (!product.category_slug && !product.subcategory_slug) return []
  let query = createSupabaseAnon().from('products').select('slug, name').is('deleted_at', null).neq('id', product.id).eq('in_stock', true).gt('stock_quantity', 0)
  query = product.subcategory_slug ? query.eq('subcategory_slug', product.subcategory_slug) : query.eq('category_slug', product.category_slug!)
  const { data, error } = await query.order('name').order('id').limit(4)
  return error ? [] : data || []
}
