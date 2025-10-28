import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// GET /api/products - Get all products
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1000
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const inStock = searchParams.get('inStock')
    
    let query = supabase
      .from('products')
      .select('*')
      .is('deleted_at', null)
    
    // Apply filters
    if (category) {
      query = query.eq('category_slug', category)
    }
    
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    
    if (inStock === 'true') {
      query = query.eq('in_stock', true)
    }
    
    // Apply limit and order
    query = query.order('created_at', { ascending: false }).limit(limit)
    
    const { data, error } = await query
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch products' },
        { status: 500 }
      )
    }
    
    // Convert price from kuruş to TL for backwards compatibility
    const products = data.map(p => ({
      ...p,
      price: p.price / 100,
      original_price: p.original_price ? p.original_price / 100 : null,
    }))
    
    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Add new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Convert camelCase to snake_case and price from TL to kuruş
    // Generate slug from name if not provided
    const generatedSlug = body.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || crypto.randomUUID()
    
    const productData: any = {
      id: body.id || crypto.randomUUID(),
      slug: body.slug || generatedSlug,
      name: body.name,
      brand: body.brand || null,
      category_slug: body.category || null,
      description: body.description || null,
      barcode: body.barcode || null,
      image: body.image || null,
      images: body.images || [],
      rating: body.rating || 0,
      reviews_count: body.reviews || 0,
      discount: body.discount || null,
      // Boolean flags (camelCase → snake_case)
      is_new: body.isNew || false,
      is_best_seller: body.isBestSeller || false,
      in_stock: body.inStock !== undefined ? body.inStock : true,
      stock_quantity: body.stock_quantity || 300,
      // Price conversion (TL → kuruş)
      price: Math.round(body.price * 100),
      original_price: body.original_price ? Math.round(body.original_price * 100) : (body.originalPrice ? Math.round(body.originalPrice * 100) : null),
    }
    
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
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
      { success: false, error: 'Failed to add product' },
      { status: 500 }
    )
  }
}
