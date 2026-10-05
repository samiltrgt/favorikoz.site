import { dbToDisplay } from '@/lib/price'

export type CatalogRow = {
  id: string; slug: string; name: string; price: number; brand?: string | null
  description?: string | null; image?: string | null; images?: unknown
  stock_quantity?: number | null; in_stock?: boolean | null; barcode?: string | null
}

function text(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

/** Do not mislabel internal barcodes as globally registered product identifiers. */
export function validGtin(value: string | null | undefined): string | undefined {
  const digits = value?.trim() || ''
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) return undefined
  let sum = 0
  for (let i = digits.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) sum += Number(digits[i]) * weight
  return (10 - sum % 10) % 10 === Number(digits[digits.length - 1]) ? digits : undefined
}

export function catalogItem(row: CatalogRow, origin: string) {
  const price = dbToDisplay(Number(row.price))
  const title = text(row.name || '').slice(0, 150)
  const images = [row.image, ...(Array.isArray(row.images) ? row.images : [])]
  let image: string | undefined
  for (const candidate of images) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue
    try {
      const url = new URL(candidate, origin)
      if (url.protocol === 'https:' || url.protocol === 'http:') { image = url.href; break }
    } catch { /* Invalid catalog image. Try the next one. */ }
  }
  if (!row.id || !row.slug || !title || !Number.isFinite(price) || price <= 0 || !image) return null
  return {
    id: row.id, title, description: text(row.description || row.name).slice(0, 5000),
    availability: row.in_stock !== false && Number(row.stock_quantity) > 0 ? 'in_stock' : 'out_of_stock',
    condition: 'new', price: `${price.toFixed(2)} TRY`,
    link: `${origin.replace(/\/+$/, '')}/urun/${encodeURIComponent(row.slug)}`,
    image_link: image, brand: text(row.brand || 'Favori Kozmetik'), gtin: validGtin(row.barcode),
  }
}

export function catalogXml(rows: CatalogRow[], origin: string): string {
  const entries = rows.map(row => catalogItem(row, origin)).filter(item => item !== null).map(item => {
    const fields = Object.entries(item).filter(([, value]) => value !== undefined)
    return `<item>${fields.map(([key, value]) => `<g:${key}>${xmlEscape(String(value))}</g:${key}>`).join('')}</item>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Favori Kozmetik</title><link>${xmlEscape(origin)}</link><description>Ürün kataloğu · TRY</description>${entries.join('')}</channel></rss>`
}

export function catalogTsv(rows: CatalogRow[], origin: string): string {
  const keys = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'gtin'] as const
  const items = rows.map(row => catalogItem(row, origin)).filter(item => item !== null)
  return [keys.join('\t'), ...items.map(item => keys.map(key => String(item[key] || '').replace(/[\t\r\n]/g, ' ')).join('\t'))].join('\n')
}
