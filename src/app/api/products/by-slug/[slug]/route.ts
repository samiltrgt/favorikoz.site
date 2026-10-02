import { NextResponse } from 'next/server'
import { createSupabaseAnon } from '@/lib/supabase/server'
import { PUBLIC_CATALOG_CACHE_CONTROL } from '@/lib/product-cache'
import { dbToDisplay } from '@/lib/price'

// GET /api/products/by-slug/[slug] - Get single product by slug (for detail page)
// Does NOT filter by in_stock so out-of-stock products can still be viewed
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAnon()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      console.error('Supabase error fetching product by slug:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch product' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Ürün bulunamadı' },
        { status: 404 }
      )
    }

    const product = {
      ...data,
      price: dbToDisplay(data.price),
      original_price: data.original_price ? dbToDisplay(data.original_price) : null,
    }

    return NextResponse.json(
      { success: true, data: product },
      { headers: { 'Cache-Control': PUBLIC_CATALOG_CACHE_CONTROL } }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
