export type CartItem = {
  id: string
  slug: string
  name: string
  image: string
  price: number
  qty: number
}

const CART_KEY = 'cart'

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setCart(items: CartItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  // Custom event dispatch for same-tab updates
  window.dispatchEvent(new CustomEvent('cartUpdated'))
}

export function addToCart(item: CartItem) {
  const cart = getCart()
  const idx = cart.findIndex(i => i.id === item.id)
  if (idx >= 0) {
    cart[idx].qty = Math.min(99, cart[idx].qty + item.qty)
  } else {
    cart.push(item)
  }
  setCart(cart)
}

export function removeFromCart(id: string) {
  const cart = getCart().filter(i => i.id !== id)
  setCart(cart)
}

export function updateQuantity(id: string, qty: number) {
  const cart = getCart()
  const idx = cart.findIndex(i => i.id === id)
  if (idx >= 0) {
    if (qty <= 0) {
      removeFromCart(id)
    } else {
      cart[idx].qty = Math.min(99, qty)
      setCart(cart)
    }
  }
}

export function clearCart() {
  setCart([])
}


