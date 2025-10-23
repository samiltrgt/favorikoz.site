import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        phone,
        role,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: customers, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customers' },
        { status: 500 }
      )
    }

    // Get order statistics for each customer
    const customersWithStats = await Promise.all(
      (customers || []).map(async (customer) => {
        // Get total orders
        const { count: orderCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', customer.id)

        // Get total spent (sum of all order totals)
        const { data: orders } = await supabase
          .from('orders')
          .select('total')
          .eq('user_id', customer.id)

        const totalSpent = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0

        // Get last order date
        const { data: lastOrder } = await supabase
          .from('orders')
          .select('created_at')
          .eq('user_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          ...customer,
          stats: {
            totalOrders: orderCount || 0,
            totalSpent: totalSpent / 100, // Convert from kuruş to TL
            lastOrderDate: lastOrder?.created_at || null,
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: customersWithStats,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
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

