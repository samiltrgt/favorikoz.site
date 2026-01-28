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
      .eq('in_stock', true) // Müşterilere sadece stokta olan ürünleri göster
      .gt('stock_quantity', 0) // Stok miktarı 0'dan büyük olmalı
    
    // Apply filters
    if (category) {
      query = query.eq('category_slug', category)
    }
    
    if (search) {
      // Search in name, brand, and description fields
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // inStock parametresi artık gereksiz çünkü varsayılan olarak filtrelenmiş durumda
    
    // Apply limit and order
    query = query.order('created_at', { ascending: false }).limit(limit)
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Supabase error:', {
        message: error.message,
        details: error,
        code: error.code,
        hint: error.hint
      })
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Failed to fetch products',
          details: process.env.NODE_ENV === 'development' ? {
            code: error.code,
            hint: error.hint,
            details: error.details
          } : undefined
        },
        { status: 500 }
      )
    }
    
    // Convert price from kuruş to TL, then divide by 10 for display
    const products = data.map(p => ({
      ...p,
      price: (p.price / 100) / 10, // Kuruş → TL → /10
      original_price: p.original_price ? (p.original_price / 100) / 10 : null,
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
    
    // Category handling: category_slug should be the main category, subcategory_slug should be the subcategory
    let categorySlug = body.category || null
    let subcategorySlug = body.subcategory || null
    
    // If subcategory is provided, find its parent category
    if (subcategorySlug) {
      const { data: subcategoryData } = await supabase
        .from('categories')
        .select('parent_slug')
        .eq('slug', subcategorySlug)
        .single()
      
      if (subcategoryData?.parent_slug) {
        categorySlug = subcategoryData.parent_slug
      }
    }
    
    const productData: any = {
      id: body.id || crypto.randomUUID(),
      slug: body.slug || generatedSlug,
      name: body.name,
      brand: body.brand || null,
      category_slug: categorySlug,
      subcategory_slug: subcategorySlug,
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
      // Price conversion (TL/10 → kuruş)
      // Admin panelden gelen fiyat zaten /10 formatında, bu yüzden *1000 yapıyoruz (TL/10 * 10 * 100 = kuruş)
      price: Math.round(body.price * 1000),
      original_price: body.original_price ? Math.round(body.original_price * 1000) : (body.originalPrice ? Math.round(body.originalPrice * 1000) : null),
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
    
    // Convert back to TL, then divide by 10 for display
    const product = {
      ...data,
      price: (data.price / 100) / 10, // Kuruş → TL → /10
      original_price: data.original_price ? (data.original_price / 100) / 10 : null,
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
