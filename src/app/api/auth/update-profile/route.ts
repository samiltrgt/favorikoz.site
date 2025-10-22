import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// PUT /api/auth/update-profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Oturum bulunamadı' },
        { status: 401 }
      )
    }
    
    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        name: body.name,
        phone: body.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    
    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json(
        { success: false, error: 'Profil güncellenemedi' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Profil güncellendi',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Profil güncellenirken hata oluştu' },
      { status: 500 }
    )
  }
}

