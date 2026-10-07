import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import CartPage from '@/app/sepet/page'
import CheckoutPage from '@/app/checkout/page'
import { refreshCartPrices } from '@/lib/cart'

jest.mock('@/components/header', () => () => null)
jest.mock('@/components/footer', () => () => null)
jest.mock('@/components/product-image', () => () => null)
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/lib/analytics/use-consented-tracking', () => ({ useConsentedTracking: jest.fn() }))
jest.mock('@/lib/cart', () => ({ refreshCartPrices: jest.fn(), setCart: jest.fn() }))

const cart = [{ id: 'p1', slug: 'product', name: 'Ürün', image: '', price: 210000, qty: 1 }]

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
  jest.mocked(refreshCartPrices).mockResolvedValue(cart)
  global.fetch = jest.fn(async (url: any) => ({
    ok: true,
    json: async () => String(url).includes('coupons')
      ? { success: true, data: { subtotalKurus: 210000, discountAmountKurus: 21000 } }
      : String(url).includes('products')
        ? { success: true, data: [{ slug: 'product', original_price: 2500 }] }
        : { success: false },
  })) as jest.Mock
})

it('does not subtract product savings a second time and applies coupon shipping consistently', async () => {
  render(<CartPage />)
  await screen.findByText('Ürünlerde Tasarruf')
  expect(screen.getByText('Toplam').parentElement).toHaveTextContent('₺2.100,00')
  fireEvent.change(screen.getByPlaceholderText('KODUNUZU GİRİN'), { target: { value: 'SAVE10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Uygula' }))
  await waitFor(() => expect(screen.getByText('Toplam').parentElement).toHaveTextContent('₺1.990,00'))
})

it('revalidates a stored cart coupon on checkout and displays the same total', async () => {
  // The storage helper's contract is exercised through the actual helper.
  const { setAppliedCouponCode } = await import('@/lib/coupon-storage')
  setAppliedCouponCode('SAVE10')
  render(<CheckoutPage />)
  await waitFor(() => expect(screen.getByText('Toplam').parentElement).toHaveTextContent('₺1.990,00'))
  expect(global.fetch).toHaveBeenCalledWith('/api/coupons/validate', expect.objectContaining({
    body: JSON.stringify({ couponCode: 'SAVE10', email: '', items: [{ id: 'p1', quantity: 1 }] }),
  }))
})
