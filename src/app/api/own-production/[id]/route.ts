import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authorized: false, status: 401 as const, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { authorized: false, status: 403 as const, error: 'Forbidden' }
  return { authorized: true }
}

// DELETE /api/own-production/[id] - Listeden çıkar (sadece admin)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer()
    const auth = await checkAdminAccess(supabase)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { error } = await supabase.from('own_production_products').delete().eq('id', params.id)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('API own-production DELETE:', err)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
