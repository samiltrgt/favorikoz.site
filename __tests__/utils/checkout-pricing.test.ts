import { calculateCheckoutTotals } from '@/lib/checkout-pricing'

describe('checkout totals in kuruş', () => {
  it('keeps exact shipping boundaries and single kuruş precision', () => {
    expect(calculateCheckoutTotals(199999).totalKurus).toBe(209999)
    expect(calculateCheckoutTotals(200000).shippingKurus).toBe(0)
    expect(calculateCheckoutTotals(31990 * 3, 1).totalKurus).toBe(105969)
  })
  it('rejects fractional or negative amounts and keeps an empty basket empty', () => {
    expect(() => calculateCheckoutTotals(319.9)).toThrow()
    expect(() => calculateCheckoutTotals(100, -1)).toThrow()
    expect(calculateCheckoutTotals(0).totalKurus).toBe(0)
  })
  it('charges 100 TL shipping when a 2100 TL basket falls below the threshold after a 210 TL coupon', () => {
    expect(calculateCheckoutTotals(210000, 21000)).toEqual({
      subtotalKurus: 210000,
      discountKurus: 21000,
      subtotalAfterDiscountKurus: 189000,
      shippingKurus: 10000,
      totalKurus: 199000,
    })
  })
})
