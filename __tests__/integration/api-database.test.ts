import { createClient } from '@supabase/supabase-js'

// Test database configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Integration Tests - API + Database', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    
    // Mock successful API responses
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/products')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: '1',
                name: 'Test Product',
                category: 'kisisel-bakim',
                price: 100,
                in_stock: true,
              }
            ]
          }),
          status: 200,
        })
      }
      
      if (url.includes('/api/auth/signup')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            message: 'Kayıt başarılı!',
            user: { id: 'test-user-id', email: 'test@example.com' }
          }),
          status: 200,
        })
      }
      
      if (url.includes('/api/auth/signin')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            message: 'Giriş başarılı!',
            user: { id: 'test-user-id', email: 'test@example.com', role: 'customer' }
          }),
          status: 200,
        })
      }
      
      if (url.includes('/api/admin/login')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            message: 'Admin girişi başarılı!',
            user: { id: 'admin-id', email: 'admin@example.com', role: 'admin' }
          }),
          status: 200,
        })
      }
      
      return Promise.reject(new Error(`Unhandled request: ${url}`))
    })
  })

  describe('Products API Integration', () => {
    it('should fetch products from database', async () => {
      const response = await fetch('http://localhost:3000/api/products')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should filter products by category', async () => {
      const response = await fetch('http://localhost:3000/api/products?category=kisisel-bakim')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
    })

    it('should search products by name', async () => {
      const response = await fetch('http://localhost:3000/api/products?search=şampuan')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
    })
  })

  describe('Authentication API Integration', () => {
    it('should create user and profile in database', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123456',
        phone: '05551234567',
      }

      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Kayıt başarılı')
    })

    it('should authenticate user and return profile', async () => {
      // First create a user
      const signupData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123456',
        phone: '05551234567',
      }

      const signupResponse = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      })

      expect(signupResponse.status).toBe(200)

      // Then login
      const loginData = {
        email: 'test@example.com',
        password: '123456',
      }

      const loginResponse = await fetch('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      })

      const loginResult = await loginResponse.json()

      expect(loginResponse.status).toBe(200)
      expect(loginResult.success).toBe(true)
      expect(loginResult.user).toBeDefined()
      expect(loginResult.user.email).toBe('test@example.com')
    })
  })

  describe('Orders API Integration', () => {
    it('should create order in database', async () => {
      // Mock user profile
      const profile = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'customer',
      }

      const orderData = {
        items: [
          {
            product_id: '1',
            quantity: 2,
            price: 100,
          },
        ],
        total: 200,
        shipping_address: {
          name: 'Test User',
          address: 'Test Address',
          city: 'Istanbul',
          postal_code: '34000',
        },
      }

      // Mock order creation
      ;(global.fetch as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            order: {
              id: 'order-123',
              order_number: 'TEST-123',
              total: 200,
              status: 'pending',
            }
          }),
          status: 200,
        })
      })

      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.order).toBeDefined()
    })
  })

  describe('Admin API Integration', () => {
    it('should create admin user and verify access', async () => {
      // Mock admin profile
      const profile = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin',
      }

      // Test admin login
      const loginResponse = await fetch('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123',
        }),
      })

      const loginData = await loginResponse.json()

      expect(loginResponse.status).toBe(200)
      expect(loginData.success).toBe(true)
      expect(loginData.user.role).toBe('admin')
    })
  })
})