import { render, screen } from '@testing-library/react'
import PaymentCallbackPage from '@/app/payment/callback/page'
import { applyConsentChoice, signalsFromState } from '@/lib/analytics/consent'
import { GET } from '@/app/api/payment/status/route'
import { sendPurchaseOnce } from '@/lib/analytics/meta-capi'

jest.mock('next/server', () => ({ NextResponse: {
  json: (body: unknown, options?: { status?: number }) => ({ status: options?.status ?? 200, json: async () => body }),
} }))
const db = { from: jest.fn(), rpc: jest.fn() }
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: () => db }))
jest.mock('@/lib/iyzico', () => ({ retrievePayment: jest.fn(), retrievePaymentByPaymentId: jest.fn(), complete3DSPaymentV2: jest.fn() }))
jest.mock('@/lib/payment-postprocessing', () => ({ processVerifiedPaymentOrder: jest.fn() }))
jest.mock('@/lib/analytics/meta-capi', () => ({ sendPurchaseOnce: jest.fn() }))

beforeEach(async () => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.mocked(fetch).mockReset().mockResolvedValue(new Response('{}'))
  await applyConsentChoice('granted')
  jest.mocked(fetch).mockClear()
  sessionStorage.clear()
  window.history.replaceState({}, '', '/payment/callback?token=synthetic-token')
  window.dataLayer = []
  window.fkTagConfig = { mode: 'direct', metaPixelId: '123456789' }
  window.fbq = jest.fn()
})
afterEach(() => jest.restoreAllMocks())

test('completed order without verification fields returns no analytics or Purchase side effects', async () => {
  const order = {
    id: 'synthetic-order', order_number: 'SYNTHETIC-ORDER', payment_token: 'synthetic-token',
    status: 'paid', payment_status: 'completed', payment_verified_at: null, iyzico_payment_id: null,
    total: 12500, shipping_cost: 0, items: [{ product_id: 'synthetic-product', quantity: 1, price: 12500 }],
    tracking: { consent: { marketing: true, analytics: true } },
  }
  const chain: any = { select: jest.fn(() => chain), eq: jest.fn(() => chain), maybeSingle: jest.fn(async () => ({ data: order, error: null })) }
  db.from.mockReturnValue(chain)
  const response = await GET({ url: 'https://unit.invalid/api/payment/status?token=synthetic-token&orderNumber=SYNTHETIC-ORDER' } as any)
  const body = await response.json()
  expect(body).toMatchObject({ status: 'success', analytics: null })
  expect(sendPurchaseOnce).not.toHaveBeenCalled()
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(body)))
  render(<PaymentCallbackPage />)
  expect(await screen.findByText('Ödeme Başarılı!')).toBeInTheDocument()
  expect(window.fbq).not.toHaveBeenCalled()
  expect(window.dataLayer).toEqual([])
  expect(sessionStorage.length).toBe(0)
})

test('explicit purchase_eligible=false prevents browser Purchase even with a positive legacy analytics payload', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
    status: 'success', purchase_eligible: false,
    analytics: {
      purchase_eligible: false, order_number: 'SYNTHETIC-INELIGIBLE', event_id: 'SYNTHETIC-INELIGIBLE',
      value: 125, contents: [{ id: 'synthetic-product', quantity: 1, item_price: 125 }],
      consent: signalsFromState('granted'),
    },
  })))
  render(<PaymentCallbackPage />)
  expect(await screen.findByText('Ödeme Başarılı!')).toBeInTheDocument()
  expect(window.fbq).not.toHaveBeenCalled()
  expect(window.dataLayer).toEqual([])
  expect(sessionStorage.getItem('purchase_sent_SYNTHETIC-INELIGIBLE_marketing')).toBeNull()
  expect(sessionStorage.getItem('purchase_sent_SYNTHETIC-INELIGIBLE_analytics')).toBeNull()
})
