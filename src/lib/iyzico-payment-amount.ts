/**
 * Iyzico /api/payment ile aynı tutarı üretir (paidPrice / basket toplamı).
 * Sipariş satırı: price alanı = (checkout’taki 10x fiyat) * 10 (kuruş benzeri).
 * orders.total = ödeme başlatılırken Iyzico'ya gönderilen nihai tutar (kuruş).
 */

export function toPriceString(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2)
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
    return toPriceString(Number(order.total) / 100)
  }

  const items = (order.items as OrderItemRow[]) || []
  let sumBasketTL = 0
  for (const item of items) {
    const qty = item.quantity || 1
    const price10x = item.price / 10
    const lineTotalTL = (price10x * qty) / 10
    sumBasketTL += parseFloat(toPriceString(lineTotalTL))
  }
  if (order.shipping_cost > 0) {
    sumBasketTL += parseFloat(toPriceString(order.shipping_cost / 100))
  }
  const discount = Number(order.discount_amount ?? 0)
  if (discount > 0) {
    sumBasketTL -= parseFloat(toPriceString(discount / 100))
  }
  return toPriceString(Math.max(0, sumBasketTL))
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

    chain = orderNumber ? chain.eq('order_number', orderNumber) : chain.eq('payment_token', token as string)
    const { error } = await chain
    if (error) console.error('[markOrderPaymentFailed]', error)
  } catch (e) {
    console.error('[markOrderPaymentFailed]', e)
  }
}
