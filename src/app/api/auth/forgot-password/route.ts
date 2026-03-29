import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'E-posta gerekli' }, { status: 400 })
    }
    const supabase = await createSupabaseServer()
    const redirectTo = `${getSiteUrl()}/sifre-yenile`

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
