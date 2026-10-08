import { isAutoBarcode, normalizeExcelProductName } from './excel-product-match'

export type DedupeProduct = {
  id: string; name: string; barcode: string | null; created_at: string | null
  image: string | null; images: string[] | null
}

export function planExcelDuplicates<T extends DedupeProduct>(products: T[]) {
  const groups = new Map<string, T[]>()
  for (const product of products) {
    const key = normalizeExcelProductName(product.name)
    groups.set(key, [...(groups.get(key) || []), product])
  }
  const actions: Array<{ keeper: T; duplicates: T[]; imageSource: T }> = []
  let skippedGroups = 0
  for (const group of Array.from(groups.values())) {
    if (group.length < 2) continue
    // Different real barcodes can be legitimate color/size variants.
    if (!group.every(p => isAutoBarcode(p.barcode))) { skippedGroups++; continue }
    const sorted = [...group].sort((a, b) =>
      Date.parse(a.created_at || '1970-01-01') - Date.parse(b.created_at || '1970-01-01') || a.id.localeCompare(b.id))
    const keeper = sorted[0]
    const imageSource = sorted.find(p => p.image && !p.image.includes('unsplash')) || keeper
    actions.push({ keeper, duplicates: sorted.slice(1), imageSource })
  }
  return { actions, skippedGroups }
}
