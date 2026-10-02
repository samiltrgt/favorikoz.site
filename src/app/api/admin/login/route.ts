import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function createSupabaseForLoginResponse(response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env eksik')
  }

  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options })
          response.cookies.set(name, value, options)
        })
      },
    },
  })
}

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

    const response = NextResponse.json({ ok: true, user: {} as Record<string, unknown> })
    const supabase = createSupabaseForLoginResponse(response)

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      await supabase.auth.signOut()
      return NextResponse.json(
        { ok: false, message: 'Bu hesap admin yetkisine sahip değil' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: profile.role,
        },
      },
      {
        headers: response.headers,
      }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { ok: false, message: 'Giriş yapılırken bir hata oluştu' },
      { status: 500 }
    )
  }
}
