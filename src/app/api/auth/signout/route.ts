import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// POST /api/auth/signout - Customer logout
export async function POST() {
  try {
    const supabase = await createSupabaseServer()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Signout error:', error)
      return NextResponse.json(
        { success: false, error: 'Çıkış yapılamadı' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Çıkış yapıldı',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Çıkış sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}

