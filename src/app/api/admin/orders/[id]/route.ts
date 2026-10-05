export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import { retractGoogleConversion } from '@/lib/analytics/google-retract'
import { noteMetaCancelUnverified } from '@/lib/analytics/meta-cancel'

// GET /api/admin/orders/[id] - Get single order (Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = params

    // Get order
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: order
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/orders/[id] - Update order (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Customer roles cannot mutate orders after the measurement migration.
    // Use service_role only after the authenticated admin role has been checked.
    const ordersDb = createSupabaseAdmin()
    const { id } = params
    const body = await request.json()
    const allowedStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled']
    const allowedPaymentStatuses = ['pending', 'completed', 'failed', 'refunded']
    if ((body.status !== undefined && !allowedStatuses.includes(body.status)) ||
      (body.payment_status !== undefined && !allowedPaymentStatuses.includes(body.payment_status))) {
      return NextResponse.json({ success: false, error: 'Geçersiz sipariş veya ödeme durumu' }, { status: 400 })
    }

    const { data: before } = await ordersDb
      .from('orders')
      .select('status, order_number, payment_status')
      .eq('id', id)
      .maybeSingle()

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    if (body.status !== undefined) updatePayload.status = body.status
    if (body.payment_status !== undefined) updatePayload.payment_status = body.payment_status
    if (body.tracking_number !== undefined) updatePayload.tracking_number = body.tracking_number || null
    if (body.carrier !== undefined) updatePayload.carrier = body.carrier || null

    const { data: order, error } = await ordersDb
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      )
    }

    // İptal: Google RETRACT; Meta negatif Purchase yok (doğrulanamadı)
    const becameCancelled = body.status === 'cancelled' && before?.status !== 'cancelled'
    const becameRefunded = body.payment_status === 'refunded' && before?.payment_status !== 'refunded'
    if ((becameCancelled || becameRefunded) && order?.order_number) {
      const hadPaid =
        before?.payment_status === 'completed' || order.payment_status === 'completed'
      if (hadPaid) {
        await retractGoogleConversion(order.order_number)
        noteMetaCancelUnverified(order.order_number)
      }
    }

    return NextResponse.json({
      success: true,
      data: order
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

