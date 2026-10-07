import { POST } from '@/app/api/payment/route'
import { getIyzicoCredentials, initialize3DSPayment } from '@/lib/iyzico'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { validateCouponForSubtotal } from '@/lib/coupons'

jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, options?: { status?: number }) => ({ status: options?.status ?? 200, json: async () => body }) },
}))
const mockDb = { from: jest.fn() }
const mockInsert = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createSupabaseAdmin: jest.fn(() => mockDb),
  createSupabaseServer: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'authenticated-user' } } }) } })),
}))
jest.mock('@/lib/iyzico', () => ({ getIyzicoCredentials: jest.fn(), initialize3DSPayment: jest.fn() }))
jest.mock('@/lib/coupons', () => ({ getCustomerIdentityKey: () => 'customer', validateCouponForSubtotal: jest.fn() }))

const consentOwner = '12345678-1234-4123-8123-123456789abc'
const grantedConsent = `fk_consent=granted; fk_consent_analytics=granted; fk_tracking_owner=${consentOwner}; fk_consent_version=1770000000000; fk_consent_ack=11`

function request(consent?: string, overrides: Record<string, unknown> = {}) {
  return {
    url: 'https://favorikoz.site/api/payment',
    headers: new Headers({ host: 'favorikoz.site', 'user-agent': 'test-browser', ...(consent ? { cookie: consent } : {}) }),
    json: async () => ({ items: [{ id: 'p1', quantity: 1 }], customerInfo: { tc: '12345678901', name: 'Buyer', email: ' Buyer@Example.COM ' }, tracking: { external_id: 'forged-user', fbp: 'fb.1.1700000000000.123456', gclid: 'test-click', consent: { marketing: true } }, ...overrides }),
  } as any
}

describe('payment initialization persists trustworthy tracking before provider payment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.mocked(createSupabaseAdmin).mockReturnValue(mockDb as any)
    jest.mocked(getIyzicoCredentials).mockReturnValue({ apiKey: 'test', secretKey: 'test', baseUrl: 'https://sandbox-api.iyzipay.com' })
    jest.mocked(initialize3DSPayment).mockResolvedValue({ status: 'success', threeDSHtmlContent: 'encoded-bank-form' })
    mockInsert.mockResolvedValue({ error: null })
    mockDb.from.mockImplementation((table: string) => table === 'products'
      ? { select: () => ({ in: async () => ({ data: [{ id: 'p1', name: 'Product', price: 50000, in_stock: true, stock_quantity: 10 }], error: null }) }) }
      : { insert: mockInsert })
  })
  afterEach(() => jest.restoreAllMocks())

  it.each([
    [17500, '175.00', 27500, '275.00'],
    [650000, '6500.00', 650000, '6500.00'],
    [31990, '319.90', 41990, '419.90'],
  ])('preserves %i kuruş from database to order and provider', async (price, line, total, paid) => {
    mockDb.from.mockImplementation((table: string) => table === 'products'
      ? { select: () => ({ in: async () => ({ data: [{ id: 'p1', name: 'Product', price, in_stock: true, stock_quantity: 10 }], error: null }) }) }
      : { insert: mockInsert })
    const response = await POST(request(undefined, { expectedTotalKurus: total }))
    expect(response.status).toBe(200)
    expect(mockInsert.mock.calls[0][0].total).toBe(total)
    const provider = jest.mocked(initialize3DSPayment).mock.calls[0][0]
    expect(provider.basketItems[0].price).toBe(line)
    expect(provider.price).toBe(paid)
    expect(provider.paidPrice).toBe(paid)
  })

  it('fails closed when service role or provider credentials are missing', async () => {
    jest.mocked(createSupabaseAdmin).mockImplementationOnce(() => { throw new Error('Missing service role') })
    expect((await POST(request())).status).toBe(503)
    jest.mocked(getIyzicoCredentials).mockReturnValue(null)
    expect((await POST(request())).status).toBe(503)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(initialize3DSPayment).not.toHaveBeenCalled()
  })

  it('keeps initialization transport errors and missing bank HTML pending', async () => {
    jest.mocked(initialize3DSPayment).mockRejectedValueOnce(new Error('timeout'))
    let response = await POST(request())
    expect(await response.json()).toEqual(expect.objectContaining({ status: 'pending', conversationId: expect.any(String), orderNumber: expect.any(String) }))
    jest.mocked(initialize3DSPayment).mockResolvedValueOnce({ status: 'success' })
    response = await POST(request())
    expect((await response.json()).status).toBe('pending')
    expect(mockInsert.mock.calls.every(([saved]) => saved.payment_status === 'pending' && saved.status === 'pending')).toBe(true)
  })

  it('never charges the card if the order cannot be persisted', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'Missing migration column' } })
    expect((await POST(request(grantedConsent))).status).toBe(503)
    expect(initialize3DSPayment).not.toHaveBeenCalled()
  })

  it('rejects a stale client total before creating an order or starting payment', async () => {
    const response = await POST(request(undefined, { expectedTotalKurus: 59999 }))
    expect(response.status).toBe(409)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(initialize3DSPayment).not.toHaveBeenCalled()
  })

  it('stores verified auth identity and consent-approved attribution on the order', async () => {
    const response = await POST(request(grantedConsent))
    expect((await response.json()).requires3DS).toBe(true)
    const savedOrder = mockInsert.mock.calls[0][0]
    expect(savedOrder.tracking.external_id).toBe('authenticated-user')
    expect(savedOrder.tracking.gclid).toBe('test-click')
    expect(savedOrder.tracking.consent.marketing).toBe(true)
    expect(savedOrder.tracking.consent_version).toBe(1770000000000)
    expect(savedOrder.tracking.consent_owner).toMatch(/^[a-f0-9]{64}$/)
    expect(savedOrder.user_id).toBe('authenticated-user')
    expect(savedOrder.customer_email).toBe('buyer@example.com')
    expect(initialize3DSPayment).toHaveBeenCalledTimes(1)
    expect(jest.mocked(initialize3DSPayment).mock.calls[0][0].buyer.email).toBe('buyer@example.com')
  })

  it('does not trust consent claimed only in the request body', async () => {
    await POST(request())
    const savedOrder = mockInsert.mock.calls[0][0]
    expect(savedOrder.tracking).toEqual({ consent: { analytics: false, marketing: false } })
    expect(savedOrder.fbp).toBeNull()
    expect(savedOrder.gclid).toBeNull()
  })

  it('does not attach advertising identity to an old grant cookie without an owner and version', async () => {
    await POST(request('fk_consent=granted'))
    const savedOrder = mockInsert.mock.calls[0][0]
    expect(savedOrder.tracking).toEqual({ consent: { analytics: false, marketing: false } })
    expect(savedOrder.tracking.external_id).toBeUndefined()
    expect(savedOrder.fbp).toBeNull()
    expect(savedOrder.gclid).toBeNull()
  })

  it('does not attach advertising identity when the consent revision is missing or invalid', async () => {
    for (const version of ['', '0', 'invalid']) {
      await POST(request(`fk_consent=granted; fk_tracking_owner=${consentOwner}; fk_consent_version=${version}`))
      const savedOrder = mockInsert.mock.calls[mockInsert.mock.calls.length - 1][0]
      expect(savedOrder.tracking.consent).toEqual({ analytics: false, marketing: false })
      expect(savedOrder.tracking.external_id).toBeUndefined()
      expect(savedOrder.fbp).toBeNull()
    }
  })

  it('sends positive discounted product lines whose total matches price, paidPrice and the stored order', async () => {
    mockDb.from.mockImplementation((table: string) => table === 'products'
      ? { select: () => ({ in: async () => ({ data: [
        { id: 'p1', name: 'First', price: 50000, in_stock: true, stock_quantity: 10 },
        { id: 'p2', name: 'Second', price: 100000, in_stock: true, stock_quantity: 10 },
      ], error: null }) }) }
      : { insert: mockInsert })
    jest.mocked(validateCouponForSubtotal).mockResolvedValueOnce({ valid: true, discountAmountKurus: 12340, subtotalAfterDiscountKurus: 137660, coupon: { code: 'DISCOUNT', discount_type: 'fixed', discount_value: 123.4 } } as any)
    const response = await POST(request(grantedConsent, { couponCode: 'DISCOUNT', items: [{ id: 'p1', quantity: 1 }, { id: 'p2', quantity: 1 }] }))
    expect({ status: response.status, body: await response.json() }).toEqual(expect.objectContaining({ status: 200 }))
    const payment = jest.mocked(initialize3DSPayment).mock.calls[0][0]
    expect(payment.basketItems.every((item: { price: string }) => Number(item.price) > 0)).toBe(true)
    expect(payment.basketItems).toHaveLength(3)
    const totalKurus = payment.basketItems.reduce((sum: number, item: { price: string }) => sum + Math.round(Number(item.price) * 100), 0)
    expect(totalKurus).toBe(147660)
    expect(Math.round(Number(payment.price) * 100)).toBe(totalKurus)
    expect(payment.paidPrice).toBe(payment.price)
    expect(mockInsert.mock.calls[0][0].total).toBe(totalKurus)
    expect(mockInsert.mock.calls[0][0].discount_amount).toBe(12340)
  })

  it('rejects a fully discounted coupon before creating an order or charging even with shipping', async () => {
    jest.mocked(validateCouponForSubtotal).mockResolvedValueOnce({ valid: true, discountAmountKurus: 50000, subtotalAfterDiscountKurus: 0, coupon: { code: 'FREE', discount_type: 'percent', discount_value: 100 } } as any)
    const response = await POST(request(undefined, { couponCode: 'FREE' }))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('Tam indirimli')
    expect(mockInsert).not.toHaveBeenCalled()
    expect(initialize3DSPayment).not.toHaveBeenCalled()
  })
})
