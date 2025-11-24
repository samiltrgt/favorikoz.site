import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

async function checkAdminAccess(supabase: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { authorized: false, error: 'Unauthorized', status: 401 }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { authorized: false, error: 'Forbidden', status: 403 }
    }

    return { authorized: true }
  } catch {
    return { authorized: false, error: 'Unauthorized', status: 401 }
  }
}

// GET /api/hero-products - Get hero products for hero section or admin
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope')
    const isAdminScope = scope === 'admin'

    if (isAdminScope) {
      const authCheck = await checkAdminAccess(supabase)
      if (!authCheck.authorized) {
        return NextResponse.json(
          { success: false, error: authCheck.error },
          { status: authCheck.status }
        )
      }
    }
    
    let query = supabase
      .from('hero_products')
      .select('*')
      .order('slide_index', { ascending: true })
      .order('slot_index', { ascending: true })
    
    if (!isAdminScope) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch hero products' },
        { status: 500 }
      )
    }
    
    // Add cache headers to prevent stale data
    return NextResponse.json(
      { success: true, data: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hero products' },
      { status: 500 }
    )
  }
}

// POST /api/hero-products - Create hero product (Admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    const authCheck = await checkAdminAccess(supabase)
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      )
    }
    
    const body = await request.json()
    
    const slideIndex = Number.isInteger(body.slide_index) ? body.slide_index : 0
    const slotIndex = Number.isInteger(body.slot_index) ? body.slot_index : 0
    const computedOrder = body.display_order ?? (slideIndex * 10 + slotIndex)

    const payload = {
      name: body.name,
      description: body.description || '',
      image: body.image,
      link: body.link || '',
      slide_index: slideIndex,
      slot_index: slotIndex,
      display_order: computedOrder,
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('hero_products')
      .select('id')
      .eq('slide_index', slideIndex)
      .eq('slot_index', slotIndex)
      .maybeSingle()

    const query = existing
      ? supabase
          .from('hero_products')
          .update(payload)
          .eq('id', existing.id)
      : supabase.from('hero_products').insert(payload)
    
    const { data, error } = await query.select().single()
    
    if (error || !data) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: error?.message || 'Failed to save hero product' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create hero product' },
      { status: 500 }
    )
  }
}

