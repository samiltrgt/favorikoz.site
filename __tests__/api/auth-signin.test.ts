import { POST } from '@/app/api/auth/signin/route'

// Mock Supabase
const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
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

describe('/api/auth/signin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should sign in user successfully with valid credentials', async () => {
    // Mock successful signin
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      },
      error: null,
    })

    mockSupabase.from().select().eq().single.mockResolvedValueOnce({
      data: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'customer',
      },
      error: null,
    })

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        password: '123456',
      }),
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('Giriş başarılı!')
    expect(data.user).toBeDefined()
  })

  it('should reject request with missing email', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        password: '123456',
      }),
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Email ve şifre zorunludur')
  })

  it('should reject invalid credentials', async () => {
    // Mock auth error
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      }),
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Geçersiz email veya şifre')
  })
})