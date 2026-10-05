import { allocateIyzicoDiscount, buildIyzicoPaidPriceFromOrder, matchesIyzicoOrderPayment, markOrderPaymentFailed } from '@/lib/iyzico-payment-amount'

describe('iyzico order verification', () => {
  const order = { total: 60000, items: [], shipping_cost: 10000, iyzico_basket_id: 'basket-1' }
  it('compares provider TL to stored kuruş with the same basket and currency', () => {
    expect(buildIyzicoPaidPriceFromOrder(order)).toBe('600.00')
    expect(matchesIyzicoOrderPayment(order, { basketId: 'basket-1', paidPrice: '600.000000', currency: 'TRY' })).toBe(true)
    expect(matchesIyzicoOrderPayment(order, { basketId: 'basket-1', paidPrice: '600', currency: 'USD' })).toBe(false)
    expect(matchesIyzicoOrderPayment(order, { basketId: 'basket-2', paidPrice: '600', currency: 'TRY' })).toBe(false)
    expect(matchesIyzicoOrderPayment(order, {})).toBe(false)
  })

  it('scopes payment failure by both token and order number when supplied', async () => {
    const chain: any = { error: null }
    chain.update = jest.fn(() => chain)
    chain.eq = jest.fn(() => chain)
    await markOrderPaymentFailed({ from: () => chain }, { paymentToken: 'token-1', orderNumber: 'ORD-1' })
    expect(chain.eq).toHaveBeenCalledWith('payment_status', 'pending')
    expect(chain.eq).toHaveBeenCalledWith('payment_token', 'token-1')
    expect(chain.eq).toHaveBeenCalledWith('order_number', 'ORD-1')
  })
})

describe('coupon allocation for positive iyzico basket lines', () => {
  it('distributes remainder pennies deterministically and keeps the exact discount', () => {
    expect(allocateIyzicoDiscount([100, 100, 100], 1)).toEqual([99, 100, 100])
    expect(allocateIyzicoDiscount([100, 100, 100], 2)).toEqual([99, 99, 100])
    expect(allocateIyzicoDiscount([50000, 100000], 12340).reduce((sum, price) => sum + price, 0)).toBe(137660)
  })

  it('preserves every positive line, including one-kuruş items', () => {
    expect(allocateIyzicoDiscount([1, 100], 50)).toEqual([1, 50])
    expect(allocateIyzicoDiscount([50, 70], 118)).toEqual([1, 1])
    expect(allocateIyzicoDiscount([1, 1], 0)).toEqual([1, 1])
  })

  it('rejects full discounts or amounts that cannot keep all lines positive', () => {
    expect(() => allocateIyzicoDiscount([100], 100)).toThrow('sıfıra düşüyor')
    expect(() => allocateIyzicoDiscount([100, 100], 199)).toThrow('sıfıra düşüyor')
    expect(() => allocateIyzicoDiscount([0, 100], 10)).toThrow('geçersiz')
  })

  it('keeps exact integer totals over varied prices and discounts', () => {
    for (const lines of [[1, 33, 101], [3, 4, 5, 6], [9007199254000, 9007199254001]]) {
      const subtotal = lines.reduce((sum, price) => sum + price, 0)
      for (const discount of [0, 1, Math.floor(subtotal / 3), subtotal - lines.length]) {
        const result = allocateIyzicoDiscount(lines, discount)
        expect(result.every((price, index) => Number.isSafeInteger(price) && price > 0 && price <= lines[index])).toBe(true)
        expect(result.reduce((sum, price) => sum + price, 0)).toBe(subtotal - discount)
      }
    }
  })
})
