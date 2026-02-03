import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'E-posta gerekli' }, { status: 400 })
    }
    const supabase = await createSupabaseServer()
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'http://localhost:3000'
    const redirectTo = `${baseUrl.replace(/\/$/, '')}/sifre-yenile`

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })

    if (error) {
      console.error('Reset password error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false, error: 'Bir hata oluştu' }, { status: 500 })
  }
}
