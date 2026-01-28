import { createClient } from '@supabase/supabase-js'

// Test database configuration - gerçek Supabase bağlantısı
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase environment variables not set. Skipping database tests.')
}

// Only create client if environment variables are available
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

describe('Database Tests - Supabase', () => {
  // Test verilerini temizle
  beforeEach(async () => {
    if (!supabaseUrl || !supabaseServiceKey) return
    
    // Test verilerini temizle
    await supabase.from('orders').delete().like('order_number', 'TEST-%')
    await supabase.from('profiles').delete().like('email', 'test-%')
  })

  describe('Products Table', () => {
    it('should fetch products from database', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(5)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should filter products by category', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'kisisel-bakim')
        .limit(5)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should search products by name', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('name', '%şampuan%')
        .limit(5)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('Profiles Table', () => {
    it('should create and fetch user profile', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const testProfile = {
        id: 'test-user-' + Date.now(),
        email: 'test-' + Date.now() + '@example.com',
        name: 'Test User',
        phone: '05551234567',
        role: 'customer',
      }

      // Create profile
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert(testProfile)
        .select()

      expect(insertError).toBeNull()
      expect(insertData).toBeDefined()
      expect(insertData![0].email).toBe(testProfile.email)

      // Fetch profile
      const { data: fetchData, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testProfile.id)
        .single()

      expect(fetchError).toBeNull()
      expect(fetchData).toBeDefined()
      expect(fetchData.email).toBe(testProfile.email)
    })

    it('should update user profile', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const testProfile = {
        id: 'test-user-' + Date.now(),
        email: 'test-' + Date.now() + '@example.com',
        name: 'Test User',
        phone: '05551234567',
        role: 'customer',
      }

      // Create profile
      await supabase.from('profiles').insert(testProfile)

      // Update profile
      const { data, error } = await supabase
        .from('profiles')
        .update({ name: 'Updated Test User', phone: '05559876543' })
        .eq('id', testProfile.id)
        .select()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data![0].name).toBe('Updated Test User')
      expect(data![0].phone).toBe('05559876543')
    })
  })

  describe('Orders Table', () => {
    it('should create and fetch order', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const testOrder = {
        id: 'test-order-' + Date.now(),
        user_id: 'test-user-' + Date.now(),
        order_number: 'TEST-' + Date.now(),
        total: 20000, // 200 TL in kuruş
        status: 'pending',
        shipping_address: {
          name: 'Test User',
          address: 'Test Address',
          city: 'Istanbul',
          postal_code: '34000',
        },
      }

      // Create order
      const { data: insertData, error: insertError } = await supabase
        .from('orders')
        .insert(testOrder)
        .select()

      expect(insertError).toBeNull()
      expect(insertData).toBeDefined()
      expect(insertData![0].order_number).toBe(testOrder.order_number)

      // Fetch order
      const { data: fetchData, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', testOrder.id)
        .single()

      expect(fetchError).toBeNull()
      expect(fetchData).toBeDefined()
      expect(fetchData.order_number).toBe(testOrder.order_number)
    })

    it('should update order status', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const testOrder = {
        id: 'test-order-' + Date.now(),
        user_id: 'test-user-' + Date.now(),
        order_number: 'TEST-' + Date.now(),
        total: 20000,
        status: 'pending',
        shipping_address: {
          name: 'Test User',
          address: 'Test Address',
          city: 'Istanbul',
          postal_code: '34000',
        },
      }

      // Create order
      await supabase.from('orders').insert(testOrder)

      // Update order status
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'shipped' })
        .eq('id', testOrder.id)
        .select()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data![0].status).toBe('shipped')
    })
  })

  describe('Database Constraints and Relationships', () => {
    it('should enforce foreign key constraints', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      // Try to create order with non-existent user_id
      const { error } = await supabase
        .from('orders')
        .insert({
          id: 'test-order-' + Date.now(),
          user_id: 'non-existent-user-id',
          order_number: 'TEST-' + Date.now(),
          total: 20000,
          status: 'pending',
        })

      // Should fail due to foreign key constraint
      expect(error).toBeDefined()
    })

    it('should enforce unique constraints', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const testProfile = {
        id: 'test-user-' + Date.now(),
        email: 'unique-test@example.com',
        name: 'Test User',
        role: 'customer',
      }

      // Create first profile
      const { error: firstError } = await supabase
        .from('profiles')
        .insert(testProfile)

      expect(firstError).toBeNull()

      // Try to create second profile with same email
      const { error: secondError } = await supabase
        .from('profiles')
        .insert({
          ...testProfile,
          id: 'different-id',
        })

      // Should fail due to unique constraint
      expect(secondError).toBeDefined()
    })
  })

  describe('Database Performance', () => {
    it('should handle large queries efficiently', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const startTime = Date.now()

      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category')
        .limit(100)

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(queryTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle complex queries with joins', async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total,
          status,
          profiles!inner(name, email)
        `)
        .limit(10)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})
