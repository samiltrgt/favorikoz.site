type CouponRow = {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  valid_from: string | null
  valid_until: string | null
  max_total_uses: number | null
  max_uses_per_customer: number | null
  is_active: boolean
}

export type CouponValidationResult =
  | { valid: false; error: string }
  | {
      valid: true
      coupon: CouponRow
      discountAmount10x: number
      subtotalAfterDiscount10x: number
      totalUsedCount: number
      customerUsedCount: number
    }

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase()
}

export function getCustomerIdentityKey(email?: string | null): string {
  return (email || '').trim().toLowerCase()
}

export function calculateCouponDiscount10x(
  subtotal10x: number,
  discountType: 'percent' | 'fixed',
  discountValue: number
): number {
  if (subtotal10x <= 0) return 0

  let discount = 0
  if (discountType === 'percent') {
    discount = Math.round((subtotal10x * discountValue) / 100)
  } else {
    // fixed value is stored in TL, subtotal is in 10x (100 TL = 1000), so multiply by 10
    discount = Math.round(discountValue * 10)
  }
  return Math.max(0, Math.min(discount, subtotal10x))
}

export async function validateCouponForSubtotal(params: {
  supabase: any
  couponCode: string
  subtotal10x: number
  customerIdentityKey: string
}): Promise<CouponValidationResult> {
  const { supabase, couponCode, subtotal10x, customerIdentityKey } = params
  const normalizedCode = normalizeCouponCode(couponCode)
  if (!normalizedCode) {
    return { valid: false, error: 'Kupon kodu giriniz' }
  }
  const { data: coupon, error: couponError } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .maybeSingle()

  if (couponError) {
    return { valid: false, error: 'Kupon doğrulanırken hata oluştu' }
  }
  if (!coupon) {
    return { valid: false, error: 'Kupon bulunamadı' }
  }
  if (!coupon.is_active) {
    return { valid: false, error: 'Kupon aktif değil' }
  }

  const now = new Date()
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { valid: false, error: 'Kupon henüz aktif değil' }
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { valid: false, error: 'Kuponun süresi dolmuş' }
  }

  const totalCountPromise = supabase.from('coupon_usages').select('id', { count: 'exact', head: true }).eq('coupon_id', coupon.id)
  const customerCountPromise = customerIdentityKey
    ? supabase
        .from('coupon_usages')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('customer_identity_key', customerIdentityKey)
    : Promise.resolve({ count: 0, error: null })

  const [{ count: totalUsedCount, error: totalCountError }, { count: customerUsedCount, error: customerCountError }] =
    await Promise.all([totalCountPromise, customerCountPromise])

  if (totalCountError || customerCountError) {
    return { valid: false, error: 'Kupon limiti kontrol edilirken hata oluştu' }
  }

  if (coupon.max_total_uses && (totalUsedCount || 0) >= coupon.max_total_uses) {
    return { valid: false, error: 'Kupon kullanım limiti doldu' }
  }
  if (customerIdentityKey && coupon.max_uses_per_customer && (customerUsedCount || 0) >= coupon.max_uses_per_customer) {
    return { valid: false, error: 'Bu kuponu kullanım hakkınız doldu' }
  }

  const discountAmount10x = calculateCouponDiscount10x(subtotal10x, coupon.discount_type, Number(coupon.discount_value))
  const subtotalAfterDiscount10x = Math.max(0, subtotal10x - discountAmount10x)

  return {
    valid: true,
    coupon,
    discountAmount10x,
    subtotalAfterDiscount10x,
    totalUsedCount: totalUsedCount || 0,
    customerUsedCount: customerUsedCount || 0,
  }
}
