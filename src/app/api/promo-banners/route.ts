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

// GET /api/promo-banners - Get promo banners (public) / admin scope
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope')
    const position = searchParams.get('position')
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
      .from('promo_banners')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!isAdminScope) {
      query = query.eq('is_active', true)
    }

    if (position) {
      query = query.eq('position', position)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Supabase error:', {
        message: error.message,
        details: error,
        code: error.code,
        hint: error.hint
      })
      return NextResponse.json(
        { success: false, error: 'Failed to fetch promo banners' },
        { status: 500 }
      )
    }

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
      { success: false, error: 'Failed to fetch promo banners' },
      { status: 500 }
    )
  }
}

// POST /api/promo-banners - Create promo banner (Admin only)
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

    // Check if banner already exists for this position
    if (body.position) {
      const { data: existing } = await supabase
        .from('promo_banners')
        .select('id')
        .eq('position', body.position)
        .eq('is_active', true)
        .single()

      if (existing) {
        // Update existing instead of creating new
        const { data, error } = await supabase
          .from('promo_banners')
          .update({
            title: body.title,
            description: body.description,
            image: body.image,
            link: body.link || '/tum-urunler',
            button_text: body.button_text || 'Tüm Ürünleri Keşfet',
            is_active: body.is_active ?? true,
            display_order: body.display_order || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          console.error('Supabase error:', error)
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, data })
      }
    }

    const { data, error } = await supabase
      .from('promo_banners')
      .insert({
        title: body.title,
        description: body.description,
        image: body.image,
        link: body.link || '/tum-urunler',
        button_text: body.button_text || 'Tüm Ürünleri Keşfet',
        position: body.position || 'top',
        is_active: body.is_active ?? true,
        display_order: body.display_order || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create promo banner' },
      { status: 500 }
    )
  }
}

