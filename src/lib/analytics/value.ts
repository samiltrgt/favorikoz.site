/**
 * Reklam platformlarına giden her tutarın tek kapısı.
 * src/lib/price.ts yeniden yazılmaz; üzerine ince katman.
 *
 * value → her zaman ekran TL (number)
 * currency → her zaman "TRY"
 * contents[].item_price → birim fiyat (TL), satır toplamı değil
 * orders.total ham değeri hiçbir olaya girmez
 */

import type { CartItem } from '@/lib/cart'
import { kurusToTl, toDisplayPrice } from '@/lib/price'
import { buildIyzicoPaidPriceFromOrder } from '@/lib/iyzico-payment-amount'

export const AD_CURRENCY = 'TRY' as const

export type AdContentItem = {
  id: string
  quantity: number
  item_price: number
}

type OrderItemRow = {
  product_id?: string
  id?: string
  price?: number
  quantity?: number
}

type OrderAmountInput = {
  items: unknown
  shipping_cost: number
  total?: number | null
  discount_amount?: number | null
}

/** Sepet toplamı — ekran TL (kargo/kupon yok; tarayıcı sepeti) */
export function adValueFromCart(cartItems: CartItem[]): number {
  let sum = 0
  for (const item of cartItems) {
    const unitTl = toDisplayPrice(Number(item.price) || 0)
    const qty = Math.max(0, Number(item.qty) || 0)
    sum += unitTl * qty
  }
  return roundMoney(sum)
}

/**
 * Ödenen tutar — kargo dahil, kupon düşülmüş.
 * Kaynak: buildIyzicoPaidPriceFromOrder (string) → number
 */
export function adValueFromOrder(order: OrderAmountInput): number {
  const paid = buildIyzicoPaidPriceFromOrder(order)
  return roundMoney(parseFloat(paid))
}

/** Sepet satırları → Meta/GA contents (birim fiyat TL) */
export function adItemsFromCart(cartItems: CartItem[]): AdContentItem[] {
  return cartItems
    .filter((item) => item.id && (Number(item.qty) || 0) > 0)
    .map((item) => ({
      id: String(item.id),
      quantity: Math.max(1, Math.floor(Number(item.qty) || 1)),
      item_price: roundMoney(toDisplayPrice(Number(item.price) || 0)),
    }))
}

/** Sipariş satırları → Meta/GA contents (birim fiyat TL) */
export function adItemsFromOrder(order: { items: unknown }): AdContentItem[] {
  const rows = (Array.isArray(order.items) ? order.items : []) as OrderItemRow[]
  const out: AdContentItem[] = []

  for (const row of rows) {
    const id = row.product_id ?? row.id
    if (!id) continue
    const qty = Math.max(1, Math.floor(Number(row.quantity) || 1))
    // orders.items[].price = kuruş benzeri (display × 100)
    const unitTl = kurusToTl(Number(row.price) || 0)
    out.push({
      id: String(id),
      quantity: qty,
      item_price: roundMoney(unitTl),
    })
  }

  return out
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
