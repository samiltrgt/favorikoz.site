/**
 * Iyzico /api/payment ile aynı tutarı üretir (paidPrice / basket toplamı).
 * Sipariş satırı: price alanı = (checkout’taki 10x fiyat) * 10 (kuruş benzeri).
 */

export function toPriceString(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2)
}

type OrderItemRow = { price: number; quantity?: number }

export function buildIyzicoPaidPriceFromOrder(order: {
  items: unknown
  shipping_cost: number
}): string {
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
  return toPriceString(sumBasketTL)
}
