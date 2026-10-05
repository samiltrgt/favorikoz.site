/**
 * Iyzico /api/payment ile aynı tutarı üretir (paidPrice / basket toplamı).
 * Sipariş satırı: price alanı = (checkout’taki 10x fiyat) * 10 (kuruş benzeri).
 * orders.total = ödeme başlatılırken Iyzico'ya gönderilen nihai tutar (kuruş).
 */

import { kurusToTl, toDisplayPrice } from '@/lib/price'

export function toPriceString(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2)
}

/** Allocate an order coupon in integer kuruş, leaving every provider line positive. */
export function allocateIyzicoDiscount(lineTotalsKurus: number[], discountKurus: number): number[] {
  if (!lineTotalsKurus.length || lineTotalsKurus.some((price) => !Number.isSafeInteger(price) || price < 1) ||
    !Number.isSafeInteger(discountKurus) || discountKurus < 0) {
    throw new Error('Sepet tutarı veya kupon indirimi geçersiz')
  }
  const subtotal = lineTotalsKurus.reduce((sum, price) => sum + price, 0)
  if (!Number.isSafeInteger(subtotal)) throw new Error('Sepet tutarı geçersiz')
  // Reserve one kuruş per line. Full-discount orders require a separate free-order flow.
  const capacity = subtotal - lineTotalsKurus.length
  if (discountKurus > capacity) {
    throw new Error('Bu kuponla ürün tutarı sıfıra düşüyor. Tam indirimli siparişler için mağazayla iletişime geçin.')
  }
  if (discountKurus === 0) return [...lineTotalsKurus]
  const denominator = BigInt(capacity)
  const allocations = lineTotalsKurus.map((price, index) => {
    const numerator = BigInt(discountKurus) * BigInt(price - 1)
    return { index, discount: Number(numerator / denominator), remainder: numerator % denominator }
  })
  let remaining = discountKurus - allocations.reduce((sum, line) => sum + line.discount, 0)
  // Largest remainder gives exact pennies without floating point or line-order drift.
  const ranked = [...allocations].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)
  for (const line of ranked) {
    if (remaining === 0) break
    allocations[line.index].discount += 1
    remaining -= 1
  }
  return lineTotalsKurus.map((price, index) => price - allocations[index].discount)
}

type OrderItemRow = { price: number; quantity?: number }

type OrderAmountInput = {
  items: unknown
  shipping_cost: number
  total?: number | null
  discount_amount?: number | null
}

export function buildIyzicoPaidPriceFromOrder(order: OrderAmountInput): string {
  if (order.total != null && Number(order.total) > 0) {
    return toPriceString(kurusToTl(Number(order.total)))
  }

  const items = (order.items as OrderItemRow[]) || []
  let sumBasketTL = 0
  for (const item of items) {
    const qty = item.quantity || 1
    const price10x = toDisplayPrice(item.price)
    const lineTotalTL = toDisplayPrice(price10x * qty)
    sumBasketTL += parseFloat(toPriceString(lineTotalTL))
  }
  if (order.shipping_cost > 0) {
    sumBasketTL += parseFloat(toPriceString(kurusToTl(order.shipping_cost)))
  }
  const discount = Number(order.discount_amount ?? 0)
  if (discount > 0) {
    sumBasketTL -= parseFloat(toPriceString(kurusToTl(discount)))
  }
  return toPriceString(Math.max(0, sumBasketTL))
}

/** A successful provider response must describe this exact order and collected amount. */
export function matchesIyzicoOrderPayment(
  order: OrderAmountInput & { iyzico_basket_id?: string | null },
  result: { basketId?: string; paidPrice?: string | number; currency?: string }
): boolean {
  const paidPrice = Number(result.paidPrice)
  return Boolean(
    order.iyzico_basket_id &&
      result.basketId === order.iyzico_basket_id &&
      result.currency === 'TRY' &&
      Number.isFinite(paidPrice) &&
      toPriceString(paidPrice) === buildIyzicoPaidPriceFromOrder(order)
  )
}

/** Tamamlanmamış ödemeyi admin listesinde "beklemede" yığınından çıkarır. */
export async function markOrderPaymentFailed(
  supabase: { from: (table: string) => any },
  opts: { paymentToken?: string | null; orderNumber?: string | null }
): Promise<void> {
  const token = opts.paymentToken?.trim()
  const orderNumber = opts.orderNumber?.trim()
  if (!token && !orderNumber) return

  try {
    let chain = supabase
      .from('orders')
      .update({ payment_status: 'failed', status: 'cancelled' })
      .eq('payment_status', 'pending')

    if (token) chain = chain.eq('payment_token', token)
    if (orderNumber) chain = chain.eq('order_number', orderNumber)
    const { error } = await chain
    if (error) console.error('[markOrderPaymentFailed]', error)
  } catch (e) {
    console.error('[markOrderPaymentFailed]', e)
  }
}
