import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { normalizeCouponCode } from '@/lib/coupons'

async function checkAdminAccess(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return { authorized: false, error: 'Forbidden: Admin access required', status: 403 }
  }

  return { authorized: true }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServer()
    const access = await checkAdminAccess(supabase)
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const body = await request.json()
    const payload: Record<string, any> = {}

    if (body.code !== undefined) payload.code = normalizeCouponCode(body.code || '')
    if (body.discountType !== undefined) payload.discount_type = body.discountType
    if (body.discountValue !== undefined) payload.discount_value = Number(body.discountValue)
    if (body.validFrom !== undefined) payload.valid_from = body.validFrom || null
    if (body.validUntil !== undefined) payload.valid_until = body.validUntil || null
    if (body.maxTotalUses !== undefined) payload.max_total_uses = body.maxTotalUses ? Number(body.maxTotalUses) : null
    if (body.maxUsesPerCustomer !== undefined)
      payload.max_uses_per_customer = body.maxUsesPerCustomer ? Number(body.maxUsesPerCustomer) : null
    if (body.isActive !== undefined) payload.is_active = !!body.isActive

    if (payload.discount_type && !['percent', 'fixed'].includes(payload.discount_type)) {
      return NextResponse.json({ success: false, error: 'Geçersiz indirim tipi' }, { status: 400 })
    }
    if (payload.discount_value !== undefined && (!Number.isFinite(payload.discount_value) || payload.discount_value <= 0)) {
      return NextResponse.json({ success: false, error: 'Geçersiz indirim değeri' }, { status: 400 })
    }
    if (payload.discount_type === 'percent' && payload.discount_value > 100) {
      return NextResponse.json({ success: false, error: 'Yüzdelik indirim 100\'den büyük olamaz' }, { status: 400 })
    }

    const { data, error } = await supabase.from('coupons').update(payload).eq('id', params.id).select('*').single()
    if (error) {
      return NextResponse.json({ success: false, error: error.message || 'Kupon güncellenemedi' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Admin coupons PUT error:', error)
    return NextResponse.json({ success: false, error: 'Kupon güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServer()
    const access = await checkAdminAccess(supabase)
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const { error } = await supabase.from('coupons').delete().eq('id', params.id)
    if (error) {
      return NextResponse.json({ success: false, error: 'Kupon silinemedi' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin coupons DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Kupon silinemedi' }, { status: 500 })
  }
}
