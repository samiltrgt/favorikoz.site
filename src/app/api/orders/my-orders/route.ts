import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// GET /api/orders/my-orders - Get current user's orders
export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Oturum bulunamadı' },
        { status: 401 }
      )
    }
    
    // Get user's orders
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Orders error:', error)
      return NextResponse.json(
        { success: false, error: 'Siparişler yüklenemedi' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Siparişler yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}

