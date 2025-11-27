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

// PUT /api/promo-banners/[id] - Update promo banner (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data, error } = await supabase
      .from('promo_banners')
      .update({
        title: body.title,
        description: body.description,
        image: body.image,
        link: body.link,
        button_text: body.button_text,
        position: body.position,
        is_active: body.is_active,
        display_order: body.display_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Promo banner not found' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update promo banner' },
      { status: 500 }
    )
  }
}

// DELETE /api/promo-banners/[id] - Delete promo banner (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer()

    const authCheck = await checkAdminAccess(supabase)
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      )
    }

    const { error } = await supabase
      .from('promo_banners')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete promo banner' },
      { status: 500 }
    )
  }
}

