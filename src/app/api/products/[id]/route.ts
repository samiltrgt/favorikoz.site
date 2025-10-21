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

// GET /api/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer()
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single()
    
    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Convert price from kuruş to TL
    const product = {
      ...data,
      price: data.price / 100,
      original_price: data.original_price ? data.original_price / 100 : null,
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

// PUT /api/products/[id] - Update product (Admin only)
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
    
    // Convert price from TL to kuruş
    const updateData: any = { ...body }
    if (body.price !== undefined) {
      updateData.price = Math.round(body.price * 100)
    }
    if (body.original_price !== undefined) {
      updateData.original_price = body.original_price ? Math.round(body.original_price * 100) : null
    }
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()
    
    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Failed to update product' },
        { status: 500 }
      )
    }
    
    // Convert back to TL
    const product = {
      ...data,
      price: data.price / 100,
      original_price: data.original_price ? data.original_price / 100 : null,
    }
    
    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Soft delete product (Admin only)
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
    
    // Soft delete by setting deleted_at
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
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
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
