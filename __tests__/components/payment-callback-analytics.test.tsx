import { act, render, screen } from '@testing-library/react'
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
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'success', purchase_eligible: true, analytics: {
    purchase_eligible: true,
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

test('legacy completed response with null analytics keeps success UI without Purchase', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true, status: 'success', analytics: null })))
  render(<PaymentCallbackPage />)
  expect(await screen.findByText('Ödeme Başarılı!')).toBeInTheDocument()
  expect(window.fbq).not.toHaveBeenCalled()
  expect(window.dataLayer).toEqual([])
  expect(sessionStorage.length).toBe(0)
  expect(fetch).toHaveBeenCalledTimes(1)
})

const eligibleAnalytics = () => ({
  purchase_eligible: true, order_number: 'SYNTHETIC-ELIGIBLE', event_id: 'SYNTHETIC-ELIGIBLE',
  value: 125, contents: [{ id: 'synthetic-product', quantity: 1, item_price: 125 }],
  consent: signalsFromState('granted'),
})
const purchaseCalls = () => jest.mocked(window.fbq!).mock.calls.filter(call => call[0] === 'track' && call[1] === 'Purchase')

test.each([undefined, null, false, 'true', 1].flatMap(flag => [
  { label: `response ${String(flag)}`, responseFlag: flag, analyticsFlag: true },
  { label: `analytics ${String(flag)}`, responseFlag: true, analyticsFlag: flag },
]))('blocks $label even when the other eligibility flag is true', async ({ responseFlag, analyticsFlag }) => {
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'success', purchase_eligible: responseFlag,
    analytics: { ...eligibleAnalytics(), purchase_eligible: analyticsFlag },
  })))
  render(<PaymentCallbackPage />)
  expect(await screen.findByText('Ödeme Başarılı!')).toBeInTheDocument()
  expect(purchaseCalls()).toHaveLength(0)
  expect(window.dataLayer).toEqual([])
  expect(sessionStorage.length).toBe(0)
  // A later permission event must not resurrect an ineligible payload.
  await act(async () => { await applyConsentChoice('granted') })
  expect(purchaseCalls()).toHaveLength(0)
  expect(sessionStorage.length).toBe(0)
})

test('eligible response preserves order event ID and per-channel reload deduplication', async () => {
  const reply = { status: 'success', purchase_eligible: true, analytics: eligibleAnalytics() }
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(reply)))
  const first = render(<PaymentCallbackPage />)
  expect(await screen.findByText('Ödeme Başarılı!')).toBeInTheDocument()
  expect(purchaseCalls()).toHaveLength(1)
  expect(purchaseCalls()[0]).toEqual(['track', 'Purchase', expect.objectContaining({ value: 125, currency: 'TRY' }), { eventID: 'SYNTHETIC-ELIGIBLE' }])
  expect(sessionStorage.getItem('purchase_sent_SYNTHETIC-ELIGIBLE_marketing')).toBe('1')
  expect(sessionStorage.getItem('purchase_sent_SYNTHETIC-ELIGIBLE_analytics')).toBe('1')
  first.unmount()
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(reply)))
  render(<PaymentCallbackPage />)
  expect(await screen.findByText('Ödeme Başarılı!')).toBeInTheDocument()
  await act(async () => { await applyConsentChoice('granted') })
  expect(purchaseCalls()).toHaveLength(1)
  expect(jest.mocked(fetch).mock.calls.some(([url]) => url === '/api/e')).toBe(false)
})

test('withdrawn current consent blocks eligible Purchase and leaves send markers empty', async () => {
  await applyConsentChoice('denied')
  window.dataLayer = []
  jest.mocked(window.fbq!).mockClear()
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'success', purchase_eligible: true, analytics: eligibleAnalytics() })))
  render(<PaymentCallbackPage />)
  expect(await screen.findByText('Ödeme Başarılı!')).toBeInTheDocument()
  expect(purchaseCalls()).toHaveLength(0)
  expect(window.dataLayer).toEqual([])
  expect(sessionStorage.length).toBe(0)
})

test('stored denied consent cannot be overridden by eligibility and current consent', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'success', purchase_eligible: true,
    analytics: { ...eligibleAnalytics(), consent: signalsFromState('denied') },
  })))
  render(<PaymentCallbackPage />)
  expect(await screen.findByText('Ödeme Başarılı!')).toBeInTheDocument()
  expect(purchaseCalls()).toHaveLength(0)
  expect(window.dataLayer).toEqual([])
  expect(sessionStorage.length).toBe(0)
})
