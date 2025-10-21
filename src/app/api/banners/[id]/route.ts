import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// Helper function to check admin access
async function checkAdminAccess(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { authorized: false, status: 401, error: 'Unauthorized' }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile || profile.role !== 'admin') {
    return { authorized: false, status: 403, error: 'Forbidden: Admin access required' }
  }
  
  return { authorized: true }
}

// PUT /api/banners/[id] - Update banner (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check admin access
    const authCheck = await checkAdminAccess(supabase)
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      )
    }
    
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('banners')
      .update({
        title: body.title,
        subtitle: body.subtitle,
        image: body.image,
        link: body.link,
        display_order: body.display_order,
        is_active: body.is_active,
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Banner not found' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update banner' },
      { status: 500 }
    )
  }
}

// DELETE /api/banners/[id] - Delete banner (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check admin access
    const authCheck = await checkAdminAccess(supabase)
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      )
    }
    
    const { error } = await supabase
      .from('banners')
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
      { success: false, error: 'Failed to delete banner' },
      { status: 500 }
    )
  }
}

