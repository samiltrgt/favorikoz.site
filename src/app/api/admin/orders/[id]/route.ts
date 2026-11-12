export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import { retractGoogleConversion } from '@/lib/analytics/google-retract'
import { noteMetaCancelUnverified } from '@/lib/analytics/meta-cancel'
import { tryProcessOrderNotifications } from '@/lib/email-notifications'

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

    const { data: before, error: lookupError } = await ordersDb
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (lookupError) {
      console.error('Order lookup error:', lookupError)
      return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 })
    }
    if (!before) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }
    if (body.payment_status === 'completed' && before.payment_status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Ödeme yalnızca ödeme sağlayıcısı doğrulamasıyla tamamlanabilir' },
        { status: 400 }
      )
    }

    const updatePayload: Record<string, unknown> = {}
    if (body.status !== undefined && body.status !== before.status) updatePayload.status = body.status
    // Never write completed here, including when the admin form echoes an already paid order.
    if (body.payment_status !== undefined && body.payment_status !== 'completed' && body.payment_status !== before.payment_status) {
      updatePayload.payment_status = body.payment_status
    }
    if (body.tracking_number !== undefined && (body.tracking_number || null) !== before.tracking_number) {
      updatePayload.tracking_number = body.tracking_number || null
    }
    if (body.carrier !== undefined && (body.carrier || null) !== before.carrier) {
      updatePayload.carrier = body.carrier || null
    }
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ success: true, data: before })
    }
    updatePayload.updated_at = new Date().toISOString()

    const { data: order, error } = await ordersDb
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      // Do not overwrite a payment confirmation, refund or status change since the read.
      .eq('payment_status', before.payment_status)
      .eq('status', before.status)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      )
    }
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Sipariş durumu değişti. Lütfen yenileyip tekrar deneyin.' },
        { status: 409 }
      )
    }

    // Queued mail failures retry through the email cron without failing the admin update.
    await tryProcessOrderNotifications(ordersDb, order.id)

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

