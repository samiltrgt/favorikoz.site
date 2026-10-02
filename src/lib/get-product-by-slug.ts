import { cache } from 'react'
import { createSupabaseAnon } from '@/lib/supabase/server'
import { dbToDisplay } from '@/lib/price'

export type ProductBySlug = {
  id: string
  slug: string
  name: string
  brand: string | null
  description: string | null
  image: string | null
  images: string[] | null
  barcode: string | null
  price: number
  original_price: number | null
  in_stock: boolean
  category_slug: string | null
  subcategory_slug: string | null
  rating: number | null
  reviews_count: number | null
}

export const getProductBySlug = cache(async (slug: string): Promise<ProductBySlug | null> => {
  const supabase = createSupabaseAnon()
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, slug, name, brand, description, image, images, barcode, price, original_price, in_stock, category_slug, subcategory_slug, rating, reviews_count'
    )
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  return {
    ...data,
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    price: dbToDisplay(data.price),
    original_price: data.original_price != null ? dbToDisplay(data.original_price) : null,
  }
})

/** Lightweight slug list for generateStaticParams (popular / newest). */
export async function getPopularProductSlugs(limit = 40): Promise<{ slug: string }[]> {
  const supabase = createSupabaseAnon()
  const { data } = await supabase
    .from('products')
    .select('slug')
    .is('deleted_at', null)
    .eq('in_stock', true)
    .gt('stock_quantity', 0)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .limit(limit)

  return (data || []).map((row) => ({ slug: row.slug }))
}
