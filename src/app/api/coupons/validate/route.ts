import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { getCustomerIdentityKey, validateCouponForSubtotal } from '@/lib/coupons'

type Item = {
  id: string
  quantity?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const couponCode = String(body.couponCode || '')
    const email = String(body.email || '')
    const items: Item[] = body.items || []

    if (!items.length) {
      return NextResponse.json({ success: false, error: 'Sepet boş' }, { status: 400 })
    }

    const productIds = items.map((i) => i.id).filter(Boolean)
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
      const qty = Math.max(1, Number(item.quantity || 1))
      const product = products.find((p: any) => p.id === item.id)
      if (!product || !product.in_stock || product.stock_quantity <= 0) {
        return NextResponse.json({ success: false, error: 'Sepette geçersiz veya stok dışı ürün var' }, { status: 400 })
      }
      subtotal10x += Math.round((Number(product.price) / 100) * qty)
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
    console.error('Coupon validate error:', error)
    return NextResponse.json({ success: false, error: 'Kupon doğrulanamadı' }, { status: 500 })
  }
}
