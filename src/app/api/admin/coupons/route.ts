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

export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    const access = await checkAdminAccess(supabase)
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (error) {
      return NextResponse.json({ success: false, error: 'Kuponlar alınamadı' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('Admin coupons GET error:', error)
    return NextResponse.json({ success: false, error: 'Kuponlar alınamadı' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const access = await checkAdminAccess(supabase)
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const body = await request.json()
    const code = normalizeCouponCode(body.code || '')
    const discountType = body.discountType
    const discountValue = Number(body.discountValue)
    const validFrom = body.validFrom || null
    const validUntil = body.validUntil || null
    const maxTotalUses = body.maxTotalUses ? Number(body.maxTotalUses) : null
    const maxUsesPerCustomer = body.maxUsesPerCustomer ? Number(body.maxUsesPerCustomer) : null
    const isActive = body.isActive !== false

    if (!code) {
      return NextResponse.json({ success: false, error: 'Kupon kodu zorunludur' }, { status: 400 })
    }
    if (!['percent', 'fixed'].includes(discountType)) {
      return NextResponse.json({ success: false, error: 'Geçersiz indirim tipi' }, { status: 400 })
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ success: false, error: 'Geçersiz indirim değeri' }, { status: 400 })
    }
    if (discountType === 'percent' && discountValue > 100) {
      return NextResponse.json({ success: false, error: 'Yüzdelik indirim 100\'den büyük olamaz' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code,
        discount_type: discountType,
        discount_value: discountValue,
        valid_from: validFrom,
        valid_until: validUntil,
        max_total_uses: maxTotalUses,
        max_uses_per_customer: maxUsesPerCustomer,
        is_active: isActive,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message || 'Kupon oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Admin coupons POST error:', error)
    return NextResponse.json({ success: false, error: 'Kupon oluşturulamadı' }, { status: 500 })
  }
}
