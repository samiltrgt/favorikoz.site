import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createSupabaseServer()

    await supabase.auth.signOut()

    const response = NextResponse.json({ ok: true })
    response.cookies.set('adminAuthV2', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { ok: false, message: 'Logout failed' },
      { status: 500 }
    )
  }
}
