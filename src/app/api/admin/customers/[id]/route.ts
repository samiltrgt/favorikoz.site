import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

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

    // Get customer profile
    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Get customer orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Orders error:', ordersError)
    }

    // Calculate statistics
    const totalOrders = orders?.length || 0
    const totalSpent = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0
    const completedOrders = orders?.filter(o => o.status === 'completed').length || 0

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          role: customer.role,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        },
        stats: {
          totalOrders,
          totalSpent: totalSpent / 100, // Convert from kuruş to TL
          pendingOrders,
          completedOrders,
          averageOrderValue: totalOrders > 0 ? (totalSpent / totalOrders) / 100 : 0,
        },
        orders: orders?.map(order => ({
          ...order,
          total: order.total / 100, // Convert to TL for display
        })) || []
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

