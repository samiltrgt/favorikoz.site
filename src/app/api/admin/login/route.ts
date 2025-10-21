import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const { email, password } = body || {}

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, message: 'Email ve şifre gerekli' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServer()

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { ok: false, message: 'Geçersiz email veya şifre' },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      // Sign out if not admin
      await supabase.auth.signOut()
      return NextResponse.json(
        { ok: false, message: 'Bu hesap admin yetkisine sahip değil' },
        { status: 403 }
      )
    }

    // Success - session cookie is automatically set by Supabase
    return NextResponse.json({
      ok: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: profile.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { ok: false, message: 'Giriş yapılırken bir hata oluştu' },
      { status: 500 }
    )
  }
}


