import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { authorized: false, status: 401 as const, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { authorized: false, status: 403 as const, error: 'Forbidden' }
  return { authorized: true }
}

// GET /api/home-carousel-products - Scroll hero altindaki slider urunleri
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { searchParams } = new URL(request.url)
    const isAdminScope = searchParams.get('scope') === 'admin'

    if (isAdminScope) {
      const auth = await checkAdminAccess(supabase)
      if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
      }
    }

    let query = supabase
      .from('home_carousel_products')
      .select(`
        id,
        display_order,
        is_active,
        created_at,
        product_id,
        products (*)
      `)
      .order('display_order', { ascending: true })

    if (!isAdminScope) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query
    if (error) {
      console.error('home-carousel-products GET error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const list = (data || []).map((row: any) => {
      const product = row.products
      return {
        ...row,
        products: product
          ? {
              ...product,
              price: (product.price / 100) / 10,
              original_price: product.original_price ? (product.original_price / 100) / 10 : null,
            }
          : null,
      }
    })

    return NextResponse.json({ success: true, data: list })
  } catch (err) {
    console.error('API home-carousel-products GET:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST /api/home-carousel-products - Urun ekle (sadece admin)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const auth = await checkAdminAccess(supabase)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const product_id = body.product_id
    if (!product_id) {
      return NextResponse.json({ success: false, error: 'product_id gerekli' }, { status: 400 })
    }

    const maxOrder = await supabase
      .from('home_carousel_products')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const display_order = (maxOrder.data?.display_order ?? -1) + 1

    const { data, error } = await supabase
      .from('home_carousel_products')
      .insert({ product_id, display_order, is_active: true })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: 'Bu urun zaten listede' }, { status: 409 })
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('API home-carousel-products POST:', err)
    return NextResponse.json({ success: false, error: 'Failed to add' }, { status: 500 })
  }
}

