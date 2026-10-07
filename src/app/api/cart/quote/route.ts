import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'

const MAX_ITEMS = 50
const MAX_QTY = 99
const PRODUCT_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Geçersiz JSON' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray((body as any).items)) {
      return NextResponse.json({ success: false, error: 'Sepet öğeleri geçersiz' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    const items = (body as { items: unknown[] }).items
    if (!items.length || items.length > MAX_ITEMS) {
      return NextResponse.json({ success: false, error: items.length ? 'Sepette çok fazla ürün var' : 'Sepet boş' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    const parsed: { id: string; quantity: number }[] = []
    for (const entry of items) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return NextResponse.json({ success: false, error: 'Sepet öğesi geçersiz' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
      }
      const item = entry as Record<string, unknown>
      const id = typeof item.id === 'string' ? item.id.trim() : ''
      const quantity = item.quantity === undefined ? 1 : item.quantity
      if (!PRODUCT_ID_RE.test(id)) return NextResponse.json({ success: false, error: 'Geçersiz ürün kimliği' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
      if (parsed.some(item => item.id === id)) return NextResponse.json({ success: false, error: 'Sepette aynı ürün tekrar edemez' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
      if (!Number.isSafeInteger(quantity) || Number(quantity) < 1 || Number(quantity) > MAX_QTY) {
        return NextResponse.json({ success: false, error: 'Geçersiz ürün adedi' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
      }
      parsed.push({ id, quantity: Number(quantity) })
    }

    const supabase = createSupabaseAdmin()
    const { data: products, error } = await supabase.from('products')
      .select('id, price, in_stock, stock_quantity, deleted_at')
      .in('id', Array.from(new Set(parsed.map((item) => item.id))))
      .is('deleted_at', null)
    if (error || !products) return NextResponse.json({ success: false, error: 'Ürünler doğrulanamadı' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })

    const byId = new Map(products.map((product: any) => [product.id, product]))
    let subtotalKurus = 0
    const canonicalItems = []
    for (const item of parsed) {
      const product: any = byId.get(item.id)
      if (!product || !product.in_stock || Number(product.stock_quantity) < item.quantity) {
        return NextResponse.json({ success: false, error: 'Sepette geçersiz veya stok dışı ürün var' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
      }
      const unitPriceKurus = Number(product.price)
      if (!Number.isSafeInteger(unitPriceKurus) || unitPriceKurus <= 0) {
        return NextResponse.json({ success: false, error: 'Ürün fiyatı geçersiz' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
      }
      subtotalKurus += unitPriceKurus * item.quantity
      if (!Number.isSafeInteger(subtotalKurus)) return NextResponse.json({ success: false, error: 'Sepet tutarı geçersiz' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
      canonicalItems.push({ id: item.id, unitPriceKurus, quantity: item.quantity })
    }
    return NextResponse.json({ success: true, data: { canonicalItems, subtotalKurus } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ success: false, error: 'Sepet fiyatı hesaplanamadı' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
