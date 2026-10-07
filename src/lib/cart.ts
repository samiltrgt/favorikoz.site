export type CartItem = {
  id: string
  slug: string
  name: string
  image: string
  /** Integer kuruş, not display TL. */
  price: number
  qty: number
}

const CART_KEY = 'cart:kurus:v2'
const LEGACY_CART_KEY = 'cart'

function parseCart(raw: string | null, legacy = false): CartItem[] {
  if (!raw) return []
  const items: unknown = JSON.parse(raw)
  if (!Array.isArray(items)) return []
  return items.flatMap((item: any) => {
    if (!item || typeof item.id !== 'string' || !item.id ||
      !['slug', 'name', 'image'].every(key => typeof item[key] === 'string') ||
      !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 1000 ||
      typeof item.price !== 'number' || !Number.isFinite(item.price)) return []
    const price = legacy ? Math.round(item.price * 10) : item.price
    if (!Number.isSafeInteger(price) || price < 1) return []
    return [{ id: item.id, slug: item.slug, name: item.name, image: item.image, price, qty: item.qty }]
  })
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (raw !== null) return parseCart(raw)
    const legacyRaw = localStorage.getItem(LEGACY_CART_KEY)
    const migrated = parseCart(legacyRaw, true)
    if (legacyRaw !== null) localStorage.setItem(CART_KEY, JSON.stringify(migrated))
    return migrated
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
    cart[idx].price = item.price
  } else {
    cart.push(item)
  }
  setCart(cart)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cartItemAdded', { detail: { id: item.id } }))
  }
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
  if (typeof window !== 'undefined') localStorage.removeItem(LEGACY_CART_KEY)
}

/** Reprice an old or stale browser basket before displaying checkout totals. */
export async function refreshCartPrices(): Promise<CartItem[]> {
  const items = getCart()
  if (!items.length) return []
  const response = await fetch('/api/cart/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ items: items.map(item => ({ id: item.id, quantity: item.qty })) }),
  })
  const result = await response.json()
  if (!response.ok || !result.success || !Array.isArray(result.data?.canonicalItems)) {
    throw new Error(result.error || 'Sepet fiyatları güncellenemedi. Lütfen tekrar deneyin.')
  }
  const canonical = new Map<string, { unitPriceKurus: number; quantity: number }>(
    result.data.canonicalItems.map((item: any) => [item.id, item])
  )
  const updated = items.map(item => {
    const quoted = canonical.get(item.id)
    if (!quoted || !Number.isSafeInteger(quoted.unitPriceKurus) || quoted.unitPriceKurus < 1 || quoted.quantity !== item.qty) {
      throw new Error('Sepet fiyatları doğrulanamadı. Lütfen tekrar deneyin.')
    }
    return { ...item, price: quoted.unitPriceKurus }
  })
  if (JSON.stringify(getCart()) !== JSON.stringify(items)) throw new Error('Sepetiniz değişti. Lütfen tekrar deneyin.')
  setCart(updated)
  return updated
}


