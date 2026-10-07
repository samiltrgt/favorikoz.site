/** Shared basket policy. All amounts are integer kuruş. */
export const FREE_SHIPPING_THRESHOLD_KURUS = 200000
export const SHIPPING_COST_KURUS = 10000

export function calculateCheckoutTotals(subtotalKurus: number, discountKurus = 0) {
  if (![subtotalKurus, discountKurus].every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('Geçersiz sepet tutarı')
  }
  const appliedDiscountKurus = Math.min(subtotalKurus, discountKurus)
  const subtotalAfterDiscountKurus = subtotalKurus - appliedDiscountKurus
  // The free shipping threshold is evaluated after coupons everywhere.
  const shippingKurus = subtotalKurus === 0 || subtotalAfterDiscountKurus >= FREE_SHIPPING_THRESHOLD_KURUS
    ? 0 : SHIPPING_COST_KURUS
  const totalKurus = subtotalAfterDiscountKurus + shippingKurus
  if (!Number.isSafeInteger(totalKurus)) throw new Error('Geçersiz sepet tutarı')
  return { subtotalKurus, discountKurus: appliedDiscountKurus, subtotalAfterDiscountKurus, shippingKurus, totalKurus }
}
