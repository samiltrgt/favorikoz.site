/**
 * Merkezi fiyat birimleri:
 * - DB, sepet, kupon, kargo ve sipariş: tam sayı kuruş (TL * 100).
 * - API ürün gösterimi ve ekrandaki fiyatlar: TL.
 * - Ödeme sağlayıcısına gönderilen fiyat: iki ondalıklı TL metni.
 */

/** DB → display (API/UI ürün fiyatı) */
export function dbToDisplay(dbPrice: number): number {
  return dbPrice / 100
}

/** Display → DB */
export function displayToDb(displayPrice: number): number {
  const kurus = Math.round((displayPrice + Number.EPSILON) * 100)
  if (!Number.isFinite(displayPrice) || !Number.isSafeInteger(kurus)) {
    throw new Error('Geçersiz fiyat')
  }
  return kurus
}

/** Sepet kuruş → ekran TL */
export function toDisplayPrice(cartPrice: number): number {
  return kurusToTl(cartPrice)
}

/** Ekran TL → sepet kuruş */
export function toCartPrice(displayPrice: number): number {
  return displayToDb(displayPrice)
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
