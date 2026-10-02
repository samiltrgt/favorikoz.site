import {
  adItemsFromCart,
  adItemsFromOrder,
  adValueFromCart,
  adValueFromOrder,
} from '@/lib/analytics/value'
import type { CartItem } from '@/lib/cart'

describe('analytics/value', () => {
  it('adValueFromCart converts cart 10x to display TL', () => {
    const cart: CartItem[] = [
      { id: 'p1', slug: 'a', name: 'A', image: '', price: 12500, qty: 1 }, // 1250 TL
    ]
    expect(adValueFromCart(cart)).toBe(1250)
  })

  it('adItemsFromCart uses unit price in TL', () => {
    const cart: CartItem[] = [
      { id: 'p1', slug: 'a', name: 'A', image: '', price: 1000, qty: 2 }, // 100 TL unit
    ]
    expect(adItemsFromCart(cart)).toEqual([
      { id: 'p1', quantity: 2, item_price: 100 },
    ])
  })

  it('adValueFromOrder uses paid total (kurus) not raw inflation', () => {
    // total = 125000 kuruş → 1250 TL
    const value = adValueFromOrder({
      items: [{ product_id: 'p1', price: 125000, quantity: 1 }],
      shipping_cost: 0,
      total: 125000,
      discount_amount: 0,
    })
    expect(value).toBe(1250)
  })

  it('adItemsFromOrder unit price from kuruş-like order lines', () => {
    const items = adItemsFromOrder({
      items: [{ product_id: 'p1', price: 125000, quantity: 1 }],
    })
    expect(items).toEqual([{ id: 'p1', quantity: 1, item_price: 1250 }])
  })
})
