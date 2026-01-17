import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// GET /api/favorites - Get user's favorites
export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Giriş yapmanız gerekiyor', favorites: [] },
        { status: 401 }
      )
    }
    
    // Get user's favorites
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('product_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json(
        { success: false, error: 'Favoriler yüklenemedi', favorites: [] },
        { status: 500 }
      )
    }
    
    const productIds = favorites?.map(f => f.product_id) || []
    
    return NextResponse.json({
      success: true,
      favorites: productIds,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Bir hata oluştu', favorites: [] },
      { status: 500 }
    )
  }
}

// POST /api/favorites - Add product to favorites
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Favorilere eklemek için giriş yapmanız gerekiyor' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { product_id } = body
    
    if (!product_id) {
      return NextResponse.json(
        { success: false, error: 'Ürün ID gerekli' },
        { status: 400 }
      )
    }
    
    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single()
    
    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Ürün bulunamadı' },
        { status: 404 }
      )
    }
    
    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .single()
    
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Ürün zaten favorilerde',
        isFavorite: true,
      })
    }
    
    // Add to favorites
    const { error: insertError } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        product_id: product_id,
      })
    
    if (insertError) {
      console.error('Error adding favorite:', insertError)
      return NextResponse.json(
        { success: false, error: 'Favorilere eklenemedi' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Ürün favorilere eklendi',
      isFavorite: true,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}

// DELETE /api/favorites - Remove product from favorites
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get('product_id')
    
    if (!product_id) {
      return NextResponse.json(
        { success: false, error: 'Ürün ID gerekli' },
        { status: 400 }
      )
    }
    
    // Remove from favorites
    const { error: deleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', product_id)
    
    if (deleteError) {
      console.error('Error removing favorite:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Favorilerden çıkarılamadı' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Ürün favorilerden çıkarıldı',
      isFavorite: false,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}

