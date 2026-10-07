import { calculateCouponDiscountKurus } from '@/lib/coupons'

describe('coupon discounts in kuruş', () => {
  it('converts fixed TL coupons to kuruş and caps them at the subtotal', () => {
    expect(calculateCouponDiscountKurus(31990, 'fixed', 10)).toBe(1000)
    expect(calculateCouponDiscountKurus(500, 'fixed', 10)).toBe(500)
  })

  it('rounds percentage discounts to the nearest kuruş', () => {
    expect(calculateCouponDiscountKurus(14999, 'percent', 10)).toBe(1500)
    expect(calculateCouponDiscountKurus(1, 'percent', 50)).toBe(1)
    expect(calculateCouponDiscountKurus(31990, 'percent', 12.5)).toBe(3999)
  })
})
