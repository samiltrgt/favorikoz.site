import { render, screen } from '@testing-library/react'
import PaymentCallbackPage from '@/app/payment/callback/page'
import { applyConsentChoice, signalsFromState } from '@/lib/analytics/consent'

beforeEach(async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.mocked(fetch).mockReset()
  jest.mocked(fetch).mockResolvedValue(new Response('{}'))
  await applyConsentChoice('granted')
  jest.mocked(fetch).mockClear()
  window.history.replaceState({}, '', '/payment/callback?token=opaque-unit-token')
  sessionStorage.clear()
  window.dataLayer = []
  window.fkTagConfig = { mode: 'direct', metaPixelId: '123456789' }
  window.fbq = jest.fn()
})
afterEach(() => jest.restoreAllMocks())

test.each([0, null])('thank-you UI succeeds without a Purchase or sent marker for value %s', async (value) => {
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'success', analytics: {
    order_number: 'UNIT-PAID', event_id: 'UNIT-PAID', value, contents: [], consent: signalsFromState('granted'),
  } })))
  render(<PaymentCallbackPage />)
  expect(await screen.findByText('Ödeme Başarılı!')).toBeInTheDocument()
  expect(screen.getByText('Siparişiniz alındı. E-posta ile bilgilendirileceksiniz.')).toBeInTheDocument()
  expect(window.fbq).not.toHaveBeenCalled()
  expect(window.dataLayer).toEqual([])
  expect(sessionStorage.getItem('purchase_sent_UNIT-PAID_marketing')).toBeNull()
  expect(sessionStorage.getItem('purchase_sent_UNIT-PAID_analytics')).toBeNull()
  expect(fetch).toHaveBeenCalledTimes(1)
})
