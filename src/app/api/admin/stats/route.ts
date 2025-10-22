import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// Check admin access
async function checkAdminAccess(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile || profile.role !== 'admin') {
    return { authorized: false, error: 'Forbidden: Admin access required', status: 403 }
  }
  
  return { authorized: true }
}

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    
    // Check admin access
    const authCheck = await checkAdminAccess(supabase)
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      )
    }
    
    // Get total products count
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
    
    // Get total orders count
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
    
    // Get total customers (profiles with role=customer)
    const { count: totalCustomers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
    
    // Get total revenue from completed orders
    const { data: completedOrders } = await supabase
      .from('orders')
      .select('total')
      .in('status', ['paid', 'shipped', 'completed'])
    
    const totalRevenue = completedOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    
    // Get recent orders (last 10)
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Get top selling products (mock for now, will be calculated from orders)
    const { data: bestSellerProducts } = await supabase
      .from('products')
      .select('id, name, is_best_seller')
      .eq('is_best_seller', true)
      .is('deleted_at', null)
      .limit(4)
    
    // Format top products (mock sales data for now)
    const topProducts = bestSellerProducts?.map((product, index) => ({
      id: product.id,
      name: product.name,
      sales: Math.floor(Math.random() * 50) + 20, // Mock data
      revenue: Math.floor(Math.random() * 10000) + 5000, // Mock data
    })) || []
    
    // Format recent orders
    const formattedRecentOrders = recentOrders?.map(order => ({
      id: order.order_number,
      customer: order.customer_name,
      amount: order.total / 100, // Convert from kuruş to TL
      status: order.status === 'paid' ? 'Ödendi' : 
              order.status === 'shipped' ? 'Kargoda' : 
              order.status === 'completed' ? 'Tamamlandı' : 
              order.status === 'pending' ? 'Beklemede' : 'İptal',
      date: new Date(order.created_at).toLocaleDateString('tr-TR'),
    })) || []
    
    const stats = {
      totalProducts: totalProducts || 0,
      totalOrders: totalOrders || 0,
      totalCustomers: totalCustomers || 0,
      totalRevenue: totalRevenue / 100, // Convert from kuruş to TL
      recentOrders: formattedRecentOrders,
      topProducts,
    }
    
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

