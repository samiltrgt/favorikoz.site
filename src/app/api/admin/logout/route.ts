import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createSupabaseServer()

    await supabase.auth.signOut()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { ok: false, message: 'Logout failed' },
      { status: 500 }
    )
  }
}
