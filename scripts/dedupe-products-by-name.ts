import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

type ProductRow = {
  id: string
  name: string
  barcode: string | null
  slug: string
  stock_quantity: number | null
  in_stock: boolean | null
  created_at: string | null
  image: string | null
}

function isAutoBarcode(barcode: string | null | undefined): boolean {
  return /^FK\d{6,}$/i.test(String(barcode || '').trim())
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function fetchAllProducts(supabase: ReturnType<typeof createClient>): Promise<ProductRow[]> {
  const pageSize = 1000
  let from = 0
  const all: ProductRow[] = []

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,barcode,slug,stock_quantity,in_stock,created_at,image')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    const batch = (data || []) as ProductRow[]
    all.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return all
}

function pickKeeper(group: ProductRow[]): ProductRow {
  const sorted = [...group].sort((a, b) => {
    const aAuto = isAutoBarcode(a.barcode)
    const bAuto = isAutoBarcode(b.barcode)
    if (aAuto !== bAuto) return aAuto ? 1 : -1

    const aImg = !!(a.image && !a.image.includes('unsplash'))
    const bImg = !!(b.image && !b.image.includes('unsplash'))
    if (aImg !== bImg) return aImg ? -1 : 1

    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0
    return aCreated - bCreated
  })
  return sorted[0]
}

async function main() {
  const dryRun = !process.argv.includes('--apply')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const products = await fetchAllProducts(supabase)
  console.log('Active products:', products.length)

  const byName = new Map<string, ProductRow[]>()
  for (const p of products) {
    const key = normalizeName(p.name)
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(p)
  }

  const duplicateGroups = [...byName.values()].filter((g) => g.length > 1)
  const toDelete: ProductRow[] = []
  const keepers: ProductRow[] = []

  for (const group of duplicateGroups) {
    const keeper = pickKeeper(group)
    keepers.push(keeper)
    for (const p of group) {
      if (p.id !== keeper.id) toDelete.push(p)
    }
  }

  console.log('Duplicate name groups:', duplicateGroups.length)
  console.log('Products to soft-delete:', toDelete.length)
  console.log('Mode:', dryRun ? 'DRY RUN' : 'APPLY')

  console.log('\nSample merges:')
  for (const group of duplicateGroups.slice(0, 12)) {
    const keeper = pickKeeper(group)
    console.log(`\nKEEP: ${keeper.name.slice(0, 55)}`)
    console.log(`  barcode=${keeper.barcode} stok=${keeper.stock_quantity} slug=${keeper.slug}`)
    for (const p of group) {
      if (p.id === keeper.id) continue
      console.log(`  DEL:  barcode=${p.barcode} stok=${p.stock_quantity} slug=${p.slug}`)
    }
  }

  if (dryRun) {
    console.log('\nDry run only. Pass --apply to soft-delete duplicates.')
    return
  }

  const now = new Date().toISOString()
  let deleted = 0
  for (const p of toDelete) {
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: now, in_stock: false })
      .eq('id', p.id)

    if (error) {
      console.error('Failed to delete', p.id, p.name.slice(0, 40), error.message)
    } else {
      deleted++
    }
  }

  console.log(`\n✅ Soft-deleted ${deleted} duplicate products`)
  console.log(`✅ Kept ${keepers.length} canonical listings (stock unchanged)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
