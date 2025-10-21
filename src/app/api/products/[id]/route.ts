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
    
    // Convert camelCase to snake_case and price from TL to kuruş
    const updateData: any = {}
    
    // Map field names (camelCase → snake_case)
    if (body.name !== undefined) updateData.name = body.name
    if (body.slug !== undefined) updateData.slug = body.slug
    if (body.brand !== undefined) updateData.brand = body.brand
    if (body.category !== undefined) updateData.category_slug = body.category
    if (body.description !== undefined) updateData.description = body.description
    if (body.barcode !== undefined) updateData.barcode = body.barcode
    if (body.image !== undefined) updateData.image = body.image
    if (body.images !== undefined) updateData.images = body.images
    if (body.rating !== undefined) updateData.rating = body.rating
    if (body.reviews !== undefined) updateData.reviews_count = body.reviews
    if (body.discount !== undefined) updateData.discount = body.discount
    
    // Boolean flags (camelCase → snake_case)
    if (body.isNew !== undefined) updateData.is_new = body.isNew
    if (body.isBestSeller !== undefined) updateData.is_best_seller = body.isBestSeller
    if (body.inStock !== undefined) updateData.in_stock = body.inStock
    
    // Stock quantity
    if (body.stock_quantity !== undefined) updateData.stock_quantity = body.stock_quantity
    
    // Price conversion (TL → kuruş)
    if (body.price !== undefined) {
      updateData.price = Math.round(body.price * 100)
    }
    if (body.original_price !== undefined) {
      updateData.original_price = body.original_price ? Math.round(body.original_price * 100) : null
    }
    if (body.originalPrice !== undefined) {
      updateData.original_price = body.originalPrice ? Math.round(body.originalPrice * 100) : null
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
