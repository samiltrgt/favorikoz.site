import { POST } from '@/app/api/payment/3ds-callback/route'
import { complete3DSPayment, complete3DSPaymentV2, retrievePayment, retrievePaymentByPaymentId } from '@/lib/iyzico'
import { reconcileVerifiedPayment } from '@/lib/payment-reconciliation'

jest.mock('next/server', () => ({ NextResponse: {
  redirect: (url: string) => ({ url }), json: (body: unknown) => ({ json: async () => body }),
} }))
const db = { from: jest.fn() }
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: () => db }))
jest.mock('@/lib/iyzico', () => ({ complete3DSPayment: jest.fn(), complete3DSPaymentV2: jest.fn(), retrievePayment: jest.fn(), retrievePaymentByPaymentId: jest.fn() }))
jest.mock('@/lib/payment-reconciliation', () => ({ reconcileVerifiedPayment: jest.fn() }))
jest.mock('@/lib/payment-postprocessing', () => ({ processVerifiedPaymentOrder: jest.fn() }))
jest.mock('@/lib/payment-reporting', () => ({ isUnrefundedVerifiedPayment: jest.fn(async () => false) }))
jest.mock('@/lib/analytics/meta-capi', () => ({ sendPurchaseOnce: jest.fn() }))

test('foreign browser-supplied 3DS payment ID must not be authenticated before authoritative order binding', async () => {
  jest.clearAllMocks()
  const log = jest.spyOn(console, 'log').mockImplementation(() => {})
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  const order = {
    id: 'synthetic-order', order_number: 'SYNTHETIC-ORDER', payment_token: 'synthetic-token',
    status: 'pending', payment_status: 'pending', iyzico_basket_id: 'own-basket',
    total: 12500, shipping_cost: 0, items: [{ price: 12500, quantity: 1 }],
  }
  const chain: any = { select: jest.fn(() => chain), eq: jest.fn(() => chain), maybeSingle: jest.fn(async () => ({ data: order, error: null })) }
  db.from.mockReturnValue(chain)
  const foreign = { status: 'success', paymentStatus: 'SUCCESS', paymentId: '9999999', basketId: 'foreign-basket', currency: 'TRY', paidPrice: '125.00' }
  jest.mocked(retrievePayment).mockResolvedValue(foreign)
  jest.mocked(retrievePaymentByPaymentId).mockResolvedValue(foreign)
  jest.mocked(complete3DSPayment).mockResolvedValue({ status: 'failure' })
  jest.mocked(complete3DSPaymentV2).mockResolvedValue({ status: 'failure' })
  try {
    await POST({ url: 'https://unit.invalid/api/payment/3ds-callback', headers: new Headers({ host: 'unit.invalid' }),
      formData: async () => new Map(Object.entries({ conversationId: 'synthetic-token', paymentId: '9999999', conversationData: 'synthetic-data', mdStatus: '1' })),
    } as any)
    expect(reconcileVerifiedPayment).not.toHaveBeenCalled()
    expect(complete3DSPayment).not.toHaveBeenCalled()
    expect(complete3DSPaymentV2).not.toHaveBeenCalled()
  } finally { log.mockRestore(); error.mockRestore() }
})
