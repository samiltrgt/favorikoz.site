import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

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

    const supabase = await createSupabaseServer()

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

    // Same price format as list API: kuruş → TL → /10
    const product = {
      ...data,
      price: (data.price / 100) / 10,
      original_price: data.original_price ? (data.original_price / 100) / 10 : null,
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
