/**
 * Merkezi fiyat birimleri:
 * - DB (products.price): display * 1000
 * - Display (API/UI): (db / 100) / 10 — ürün kartlarında ₺ olarak gösterilir
 * - Cart (10x): display * 10
 * - Sipariş tutarları: genelde kuruş (TL * 100)
 */

/** DB → display (API/UI ürün fiyatı) */
export function dbToDisplay(dbPrice: number): number {
  return (dbPrice / 100) / 10
}

/** Display → DB */
export function displayToDb(displayPrice: number): number {
  return Math.round(displayPrice * 1000)
}

/** Cart (10x) → display */
export function toDisplayPrice(cartPrice: number): number {
  return cartPrice / 10
}

/** Display → cart (10x) */
export function toCartPrice(displayPrice: number): number {
  return displayPrice * 10
}

/** Kuruş → TL (sipariş / e-posta) */
export function kurusToTl(kurus: number): number {
  return kurus / 100
}

/** Display (veya TL) tutarı tr-TR para metni — sembol yok */
export function formatTRY(amount: number): string {
  return amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
