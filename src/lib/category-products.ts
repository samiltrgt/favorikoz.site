import { createSupabaseAnon } from '@/lib/supabase/server'
import { cache } from 'react'
import { dbToDisplay } from '@/lib/price'
import type { ProductCardProduct } from '@/components/product-card'

export type CategoryListProduct = ProductCardProduct & {
  created_at?: string
  stock_quantity?: number
  category_slug?: string | null
  subcategory_slug?: string | null
}

function mapImages(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const urls = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  return urls.length > 0 ? urls : undefined
}

function mapProduct(row: Record<string, unknown>): CategoryListProduct {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    brand: row.brand ? String(row.brand) : undefined,
    price: dbToDisplay(Number(row.price)),
    original_price: row.original_price != null ? dbToDisplay(Number(row.original_price)) : null,
    image: String(row.image || ''),
    images: mapImages(row.images),
    rating: typeof row.rating === 'number' ? row.rating : undefined,
    reviews_count: typeof row.reviews_count === 'number' ? row.reviews_count : undefined,
    in_stock: row.in_stock !== false,
    is_new: row.is_new === true,
    is_best_seller: row.is_best_seller === true,
    created_at: row.created_at ? String(row.created_at) : undefined,
    stock_quantity: typeof row.stock_quantity === 'number' ? row.stock_quantity : undefined,
    category_slug: row.category_slug ? String(row.category_slug) : null,
    subcategory_slug: row.subcategory_slug ? String(row.subcategory_slug) : null,
  }
}

const PRODUCT_SELECT =
  'id, slug, name, brand, price, original_price, image, images, rating, reviews_count, in_stock, is_new, is_best_seller, stock_quantity, created_at, category_slug, subcategory_slug'

function baseInStockProductsQuery(supabase: ReturnType<typeof createSupabaseAnon>) {
  return supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .is('deleted_at', null)
    .eq('in_stock', true)
    .gt('stock_quantity', 0)
}

type InStockProductsQuery = ReturnType<typeof baseInStockProductsQuery>

async function fetchMappedProducts(
  applyFilters: (query: InStockProductsQuery) => InStockProductsQuery
): Promise<CategoryListProduct[]> {
  const supabase = createSupabaseAnon()
  const pageSize = 1000
  let from = 0
  const all: CategoryListProduct[] = []

  while (true) {
    let query = applyFilters(baseInStockProductsQuery(supabase))
    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error

    const batch = (data || []).map((row) => mapProduct(row as Record<string, unknown>))
    all.push(...batch)
    // PostgREST can cap a response below the requested range. Advance by rows
    // actually received, never by the requested page size.
    if (batch.length === 0) {
      if (count != null && from < count) throw new Error('Catalog pagination ended before the reported total')
      break
    }
    from += batch.length
    if (count != null && from >= count) break
  }

  return all
}

/** All in-stock products (SSR catalog pages). */
export const getAllProducts = cache(async function getAllProducts(): Promise<CategoryListProduct[]> {
  return fetchMappedProducts((query) => query)
})

/** Category page: in-stock products under a top-level category_slug. */
export const getCategoryProducts = cache(async function getCategoryProducts(categorySlug: string): Promise<CategoryListProduct[]> {
  return fetchMappedProducts((query) => query.eq('category_slug', categorySlug))
})

/** Subcategory page: in-stock products whose subcategory_slug is in the allowed set. */
export async function getSubcategoryProducts(
  categorySlug: string,
  subcategorySlugs: string[]
): Promise<CategoryListProduct[]> {
  if (subcategorySlugs.length === 0) return []

  return fetchMappedProducts((query) =>
    query.eq('category_slug', categorySlug).in('subcategory_slug', subcategorySlugs)
  )
}

export async function getCategoryNameBySlug(slug: string): Promise<string | null> {
  const supabase = createSupabaseAnon()
  const { data, error } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data?.name ?? null
}
