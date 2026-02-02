import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authorized: false, status: 401 as const, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { authorized: false, status: 403 as const, error: 'Forbidden' }
  return { authorized: true }
}

// GET /api/own-production - Anasayfa "Exclusive Collection" bölümü için ürünler (herkese açık)
export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    const { data, error } = await supabase
      .from('own_production_products')
      .select(`
        id,
        display_order,
        is_active,
        created_at,
        product_id,
        products (*)
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('own-production GET error:', error)
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
    console.error('API own-production GET:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST /api/own-production - Ürün ekle (sadece admin)
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
      .from('own_production_products')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const display_order = (maxOrder.data?.display_order ?? -1) + 1

    const { data, error } = await supabase
      .from('own_production_products')
      .insert({ product_id, display_order, is_active: true })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: 'Bu ürün zaten listede' }, { status: 409 })
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('API own-production POST:', err)
    return NextResponse.json({ success: false, error: 'Failed to add' }, { status: 500 })
  }
}
