import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// POST /api/auth/signin - Customer login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email ve şifre zorunludur' },
        { status: 400 }
      )
    }
    
    const supabase = await createSupabaseServer()
    
    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { success: false, error: 'Email veya şifre hatalı' },
        { status: 401 }
      )
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'Giriş yapılamadı' },
        { status: 401 }
      )
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    return NextResponse.json({
      success: true,
      message: 'Giriş başarılı!',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile?.name || '',
        phone: profile?.phone || '',
        role: profile?.role || 'customer',
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Giriş sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}

