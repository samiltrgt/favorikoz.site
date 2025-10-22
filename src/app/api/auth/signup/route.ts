import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// POST /api/auth/signup - Register new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, phone } = body
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email ve şifre zorunludur' },
        { status: 400 }
      )
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      )
    }
    
    const supabase = await createSupabaseServer()
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
          phone: phone || '',
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/auth/callback`,
      },
    })
    
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      )
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'Kullanıcı oluşturulamadı' },
        { status: 500 }
      )
    }
    
    // Create profile (will be auto-created by trigger, but we can also do it manually)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        name: name || '',
        phone: phone || '',
        role: 'customer',
      })
    
    if (profileError) {
      console.error('Profile error:', profileError)
      // Don't fail if profile creation fails (trigger might have done it)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Kayıt başarılı! Giriş yapabilirsiniz.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Kayıt sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}

