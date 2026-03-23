import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authorized: false, status: 401 as const, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { authorized: false, status: 403 as const, error: 'Forbidden' }
  return { authorized: true }
}

// GET /api/promo-banner-products?banner_id=...&scope=admin
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { searchParams } = new URL(request.url)
    const bannerId = searchParams.get('banner_id')
    const isAdminScope = searchParams.get('scope') === 'admin'

    if (isAdminScope) {
      const auth = await checkAdminAccess(supabase)
      if (!auth.authorized) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    let query = supabase
      .from('promo_banner_products')
      .select(`
        id,
        banner_id,
        product_id,
        display_order,
        is_active,
        products (*)
      `)
      .order('display_order', { ascending: true })

    if (!isAdminScope) query = query.eq('is_active', true)
    if (bannerId) query = query.eq('banner_id', bannerId)

    const { data, error } = await query
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    const list = (data || []).map((row: any) => {
      const p = row.products
      return {
        ...row,
        products: p
          ? {
              ...p,
              price: (p.price / 100) / 10,
              original_price: p.original_price ? (p.original_price / 100) / 10 : null,
            }
          : null,
      }
    })

    return NextResponse.json({ success: true, data: list })
  } catch (err) {
    console.error('promo-banner-products GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST /api/promo-banner-products - add product under banner (admin)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const auth = await checkAdminAccess(supabase)
    if (!auth.authorized) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

    const body = await request.json()
    const banner_id = body.banner_id
    const product_id = body.product_id
    if (!banner_id || !product_id) {
      return NextResponse.json({ success: false, error: 'banner_id ve product_id gerekli' }, { status: 400 })
    }

    const maxOrder = await supabase
      .from('promo_banner_products')
      .select('display_order')
      .eq('banner_id', banner_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const display_order = (maxOrder.data?.display_order ?? -1) + 1
    const { data, error } = await supabase
      .from('promo_banner_products')
      .insert({ banner_id, product_id, display_order, is_active: true })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: 'Bu urun zaten bu bannerda var' }, { status: 409 })
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('promo-banner-products POST error:', err)
    return NextResponse.json({ success: false, error: 'Failed to add' }, { status: 500 })
  }
}

