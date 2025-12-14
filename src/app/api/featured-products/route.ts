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

// GET /api/featured-products - Get all featured products
export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    
    const { data, error } = await supabase
      .from('featured_products')
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
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch featured products' },
        { status: 500 }
      )
    }
    
    // Convert price from kuruş to TL
    const featuredProducts = data.map(fp => {
      const product = fp.products as any
      return {
        ...fp,
        products: product ? {
          ...product,
          price: (product.price / 100) / 10, // Kuruş → TL → /10
          original_price: product.original_price ? (product.original_price / 100) / 10 : null,
        } : null
      }
    })
    
    return NextResponse.json({ success: true, data: featuredProducts })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch featured products' },
      { status: 500 }
    )
  }
}

// POST /api/featured-products - Add featured product (Admin only)
export async function POST(request: NextRequest) {
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
      .from('featured_products')
      .insert({
        product_id: body.product_id,
        display_order: body.display_order || 0,
        is_active: body.is_active ?? true,
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
      { success: false, error: 'Failed to add featured product' },
      { status: 500 }
    )
  }
}

