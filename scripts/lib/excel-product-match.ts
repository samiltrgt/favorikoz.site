export function isAutoBarcode(barcode: unknown): boolean {
  return /^FK\d{6,}$/i.test(String(barcode || '').trim())
}

type ExistingProduct = { id: string; barcode: string | null; created_at: string | null }

export async function findExistingExcelProduct(supabase: any, product: { name: string; barcode: string }): Promise<ExistingProduct | null> {
  const fields = 'id, barcode, price, original_price, created_at'
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
  return rows.sort((a, b) => {
    if (isAutoBarcode(a.barcode) !== isAutoBarcode(b.barcode)) return isAutoBarcode(a.barcode) ? 1 : -1
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  })[0] || null
}
