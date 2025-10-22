import { POST } from '@/app/api/auth/signup/route'

// Mock Supabase
const mockSupabase = {
  auth: {
    signUp: jest.fn(),
    admin: {
      deleteUser: jest.fn(),
    },
  },
  from: jest.fn(() => ({
    upsert: jest.fn(),
  })),
}

jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServer: jest.fn(() => mockSupabase),
}))

// Mock NextResponse
const mockNextResponse = {
  json: jest.fn((data, init) => ({
    json: () => Promise.resolve(data),
    status: init?.status || 200,
  })),
}

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: mockNextResponse,
}))

describe('/api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create user successfully with valid data', async () => {
    // Mock successful signup
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      },
      error: null,
    })

    mockSupabase.from().upsert.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    // Create a mock request object
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        name: 'Test User',
        email: 'test@example.com',
        password: '123456',
        phone: '05551234567',
      }),
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('Kayıt başarılı')
  })

  it('should reject request with missing email', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        name: 'Test User',
        password: '123456',
      }),
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Email ve şifre zorunludur')
  })

  it('should reject weak password (less than 6 characters)', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        name: 'Test User',
        email: 'test@example.com',
        password: '123', // Too short
        phone: '05551234567',
      }),
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('6 karakter')
  })

  it('should handle Supabase auth error', async () => {
    // Mock Supabase auth error
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: { message: 'User already registered' },
    })

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        name: 'Test User',
        email: 'existing@example.com',
        password: '123456',
      }),
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('User already registered')
  })
})