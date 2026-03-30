const COUPON_KEY = 'appliedCouponCode'

export function getAppliedCouponCode(): string {
  if (typeof window === 'undefined') return ''
  return (localStorage.getItem(COUPON_KEY) || '').trim().toUpperCase()
}

export function setAppliedCouponCode(code: string) {
  if (typeof window === 'undefined') return
  const normalized = code.trim().toUpperCase()
  if (!normalized) {
    localStorage.removeItem(COUPON_KEY)
    return
  }
  localStorage.setItem(COUPON_KEY, normalized)
}

export function clearAppliedCouponCode() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(COUPON_KEY)
}
