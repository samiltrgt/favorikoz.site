import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { getCustomerIdentityKey, normalizeCouponCode, validateCouponForSubtotal } from '@/lib/coupons'
import { dbToDisplay, toCartPrice } from '@/lib/price'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { devError } from '@/lib/logger'

const MAX_COUPON_CODE_LEN = 64
const MAX_EMAIL_LEN = 254
const MAX_ITEMS = 50
const MAX_QTY = 99
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Item = {
  id: string
  quantity?: number
}

function validateBody(body: unknown):
  | { ok: true; couponCode: string; email: string; items: Item[] }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Geçersiz istek gövdesi' }
  }

  const raw = body as Record<string, unknown>
  const couponCodeRaw = typeof raw.couponCode === 'string' ? raw.couponCode : ''
  const couponCode = normalizeCouponCode(couponCodeRaw)

  if (!couponCode) {
    return { ok: false, error: 'Kupon kodu giriniz' }
  }
  if (couponCode.length > MAX_COUPON_CODE_LEN) {
    return { ok: false, error: 'Kupon kodu çok uzun' }
  }

  const emailRaw = typeof raw.email === 'string' ? raw.email.trim() : ''
  if (emailRaw) {
    if (emailRaw.length > MAX_EMAIL_LEN || !EMAIL_RE.test(emailRaw)) {
      return { ok: false, error: 'Geçersiz e-posta' }
    }
  }

  if (!Array.isArray(raw.items)) {
    return { ok: false, error: 'Sepet öğeleri geçersiz' }
  }
  if (raw.items.length === 0) {
    return { ok: false, error: 'Sepet boş' }
  }
  if (raw.items.length > MAX_ITEMS) {
    return { ok: false, error: 'Sepette çok fazla ürün var' }
  }

  const items: Item[] = []
  for (const entry of raw.items) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { ok: false, error: 'Sepet öğesi geçersiz' }
    }
    const item = entry as Record<string, unknown>
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!id || !UUID_RE.test(id)) {
      return { ok: false, error: 'Geçersiz ürün kimliği' }
    }

    const qtyRaw = item.quantity === undefined ? 1 : Number(item.quantity)
    if (!Number.isFinite(qtyRaw) || !Number.isInteger(qtyRaw) || qtyRaw < 1 || qtyRaw > MAX_QTY) {
      return { ok: false, error: 'Geçersiz ürün adedi' }
    }

    items.push({ id, quantity: qtyRaw })
  }

  return { ok: true, couponCode, email: emailRaw, items }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed, retryAfterSec } = checkRateLimit(
      `coupons-validate:${ip}`,
      RATE_LIMIT,
      RATE_WINDOW_MS
    )
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSec) },
        }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Geçersiz JSON' }, { status: 400 })
    }

    const parsed = validateBody(body)
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
    }

    const { couponCode, email, items } = parsed
    const productIds = items.map((i) => i.id)
    const supabase = createSupabaseAdmin()
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, price, in_stock, stock_quantity')
      .in('id', productIds)

    if (productError || !products) {
      return NextResponse.json({ success: false, error: 'Ürünler doğrulanamadı' }, { status: 500 })
    }

    let subtotal10x = 0
    for (const item of items) {
      const qty = item.quantity ?? 1
      const product = products.find((p: { id: string }) => p.id === item.id)
      if (!product || !product.in_stock || product.stock_quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Sepette geçersiz veya stok dışı ürün var' },
          { status: 400 }
        )
      }
      subtotal10x += Math.round(toCartPrice(dbToDisplay(Number(product.price))) * qty)
    }

    const customerIdentityKey = getCustomerIdentityKey(email)
    const result = await validateCouponForSubtotal({
      supabase,
      couponCode,
      subtotal10x,
      customerIdentityKey,
    })

    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        couponCode: result.coupon.code,
        discountType: result.coupon.discount_type,
        discountValue: Number(result.coupon.discount_value),
        subtotal: subtotal10x,
        discountAmount: result.discountAmount10x,
        subtotalAfterDiscount: result.subtotalAfterDiscount10x,
      },
    })
  } catch (error) {
    devError('Coupon validate error:', error)
    return NextResponse.json({ success: false, error: 'Kupon doğrulanamadı' }, { status: 500 })
  }
}
