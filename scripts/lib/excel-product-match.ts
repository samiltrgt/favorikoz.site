export function isAutoBarcode(barcode: unknown): boolean {
  return /^FK\d{6,}$/i.test(String(barcode || '').trim())
}

type ExistingProduct = { id: string; barcode: string | null; created_at: string | null }

export function normalizeExcelProductName(name: string): string {
  return name.normalize('NFC').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')
}

export async function findExistingExcelProduct(supabase: any, product: { name: string; barcode: string }): Promise<ExistingProduct | null> {
  const fields = 'id, name, barcode, price, original_price, created_at'
  // A row-derived FK barcode is not stable when Excel rows move.
  if (!isAutoBarcode(product.barcode)) {
    const active = await supabase.from('products').select(fields).eq('barcode', product.barcode)
      .is('deleted_at', null).order('created_at', { ascending: true }).limit(1)
    if (active.error) throw active.error
    if (active.data?.length) return active.data[0]
    const deleted = await supabase.from('products').select(fields).eq('barcode', product.barcode)
      .not('deleted_at', 'is', null).order('created_at', { ascending: true }).limit(1)
    if (deleted.error) throw deleted.error
    if (deleted.data?.length) return deleted.data[0]
  }
  const byName = await supabase.from('products').select(fields).eq('name', product.name)
    .is('deleted_at', null).order('created_at', { ascending: true }).limit(5)
  if (byName.error) throw byName.error
  const rows = (byName.data || []) as ExistingProduct[]
  // Excel spacing/case changes must not create another row-derived FK listing.
  if (!rows.length && isAutoBarcode(product.barcode)) {
    const nameKey = normalizeExcelProductName(product.name)
    for (let from = 0; ; from += 1000) {
      const page = await supabase.from('products').select(fields)
        .is('deleted_at', null).order('id', { ascending: true }).range(from, from + 999)
      if (page.error) throw page.error
      const candidates = (page.data || []) as (ExistingProduct & { name: string })[]
      rows.push(...candidates.filter(row => isAutoBarcode(row.barcode) && normalizeExcelProductName(row.name) === nameKey))
      if (candidates.length < 1000) break
    }
  }
  return rows.sort((a, b) => {
    if (isAutoBarcode(a.barcode) !== isAutoBarcode(b.barcode)) return isAutoBarcode(a.barcode) ? 1 : -1
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  })[0] || null
}
