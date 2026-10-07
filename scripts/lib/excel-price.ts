/** Parse a price expressed in TL, preserving decimal separators used by Excel. */
export function parseExcelPrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  let text = value.trim().replace(/[\s\u00a0\u202f]/g, '')
  if (!text) return null
  // Currency labels/symbols may surround the number, but cannot interrupt it.
  text = text.replace(/^(?:₺|TRY|TL)/i, '').replace(/(?:₺|TRY|TL)$/i, '')
  if (!/^[+-]?(?:\d+|\d{1,3}(?:[.,]\d{3})+)(?:[.,]\d+)?$/.test(text)) return null

  const comma = text.lastIndexOf(',')
  const dot = text.lastIndexOf('.')
  let normalized: string
  if (comma >= 0 && dot >= 0) {
    // The last separator is decimal; the other is a valid thousands grouping.
    const decimal = comma > dot ? ',' : '.'
    const grouping = decimal === ',' ? '.' : ','
    const split = text.lastIndexOf(decimal)
    const integer = text.slice(0, split)
    const fraction = text.slice(split + 1)
    if (!/^\d{1,3}(?:[.,]\d{3})*$/.test(integer.replace(/^[+-]/, ''))) {
      return null
    }
    if (integer.split(grouping).slice(1).some((part) => part.length !== 3) || integer.includes(grouping) === false) return null
    normalized = `${integer.replaceAll(grouping, '')}.${fraction}`
  } else if (comma >= 0) {
    // A comma is decimal in Turkish notation; repeated commas are only valid grouping.
    if ((text.match(/,/g) || []).length > 1) {
      if (!/^\d{1,3}(?:,\d{3})+$/.test(text)) return null
      normalized = text.replaceAll(',', '')
    } else normalized = text.replace(',', '.')
  } else {
    // Dots are decimal separators in the source workbook, including 175.0.
    if ((text.match(/\./g) || []).length > 1) return null
    normalized = text
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function isValidSalePrice(price: number | null): price is number {
  if (price === null || !Number.isFinite(price) || price <= 0) return false
  const kurus = Math.round((price + Number.EPSILON) * 100)
  return Number.isSafeInteger(kurus) && kurus > 0
}

export function isValidOptionalOldPrice(price: number | null): price is number | null {
  return price === null || isValidSalePrice(price)
}
