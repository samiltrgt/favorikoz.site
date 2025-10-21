import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 })
    }
    
    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, name, email')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Not authorized' }, { status: 403 })
    }
    
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: profile.email || user.email,
        name: profile.name,
        role: profile.role,
      },
    })
  } catch (error) {
    console.error('Me endpoint error:', error)
    return NextResponse.json({ ok: false, message: 'Internal error' }, { status: 500 })
  }
}

export async function HEAD() {
  const response = await GET()
  return new Response(null, { status: response.status })
}


