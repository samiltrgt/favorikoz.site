import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CartPage from '@/app/sepet/page'
import CheckoutPage from '@/app/checkout/page'
import { getCart, setCart } from '@/lib/cart'

jest.mock('@/components/header', () => () => null)
jest.mock('@/components/footer', () => () => null)
jest.mock('@/components/product-image', () => () => null)
jest.mock('@/lib/analytics/use-consented-tracking', () => ({ useConsentedTracking: jest.fn() }))

const stored = [
  { id: 'p1', slug: 'one', name: 'Birinci ürün', image: '', price: 10000, qty: 1 },
  { id: 'p2', slug: 'two', name: 'İkinci ürün', image: '', price: 20000, qty: 2 },
]
const quote = { success: true, data: { canonicalItems: stored.map(item => ({ id: item.id, quantity: item.qty, unitPriceKurus: item.price + 1000 })), subtotalKurus: 53000 } }
const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response

beforeEach(() => { localStorage.clear(); setCart(stored); jest.clearAllMocks() })

it.each(['network', 'server', 'html', 'partial'])('keeps both saved products when the quote fails with %s and recovers on retry', async failure => {
  let failing = true
  global.fetch = jest.fn(async (url: any) => {
    if (String(url).includes('/api/cart/quote')) {
      if (!failing) return response(quote)
      if (failure === 'network') throw new Error('offline')
      if (failure === 'html') return { ok: false, json: async () => { throw new SyntaxError('HTML') } } as unknown as Response
      if (failure === 'partial') return response({ success: true, data: { canonicalItems: quote.data.canonicalItems.slice(0, 1) } })
      return response({ success: false, error: 'Ürünler doğrulanamadı' }, false)
    }
    return response({ success: true, data: [] })
  }) as jest.Mock
  render(<CartPage />)
  await screen.findByRole('alert')
  expect(screen.queryByText('Sepetiniz Boş')).not.toBeInTheDocument()
  expect(screen.getByText('Birinci ürün')).toBeInTheDocument()
  expect(screen.getByText('İkinci ürün')).toBeInTheDocument()
  expect(getCart()).toEqual(stored)
  expect(screen.getByRole('link', { name: 'Güvenli Ödeme' })).toHaveAttribute('aria-disabled', 'true')
  failing = false
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar Dene' }))
  await waitFor(() => expect(screen.getByRole('link', { name: 'Güvenli Ödeme' })).toHaveAttribute('aria-disabled', 'false'))
  expect(getCart().map(item => item.price)).toEqual([11000, 21000])
})

it('does not turn a successful price quote into an empty cart when optional product details fail', async () => {
  global.fetch = jest.fn(async (url: any) => String(url).includes('/api/cart/quote') ? response(quote) : response({ success: false }, false)) as jest.Mock
  render(<CartPage />)
  await screen.findByText('Birinci ürün')
  expect(screen.getByText('İkinci ürün')).toBeInTheDocument()
  expect(screen.queryByText('Sepetiniz Boş')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Güvenli Ödeme' })).toHaveAttribute('aria-disabled', 'false')
})

it('shows the empty state only for an actually empty basket without a quote request', async () => {
  setCart([])
  global.fetch = jest.fn()
  render(<CartPage />)
  await screen.findByText('Sepetiniz Boş')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(global.fetch).not.toHaveBeenCalled()
})

it('does not wait for optional product metadata before displaying a verified basket', async () => {
  global.fetch = jest.fn((url: any) => String(url).includes('/api/cart/quote') ? Promise.resolve(response(quote)) : new Promise(() => {})) as jest.Mock
  render(<CartPage />)
  await screen.findByText('Birinci ürün')
  expect(screen.getByRole('link', { name: 'Güvenli Ödeme' })).toHaveAttribute('aria-disabled', 'false')
})

it('direct checkout preserves the basket and blocks the payment form when prices cannot be verified', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline'))
  render(<CheckoutPage />)
  await screen.findByRole('alert')
  expect(screen.queryByText('Sepetiniz Boş')).not.toBeInTheDocument()
  expect(getCart()).toEqual(stored)
  expect(screen.queryByLabelText(/Kart Numarası/i)).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Sepete Dön' })).toHaveAttribute('href', '/sepet')
})
