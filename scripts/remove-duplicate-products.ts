#!/usr/bin/env tsx
/**
 * Aynı barkoda sahip mükerrer ürünleri temizler.
 * Paneldeki (Excel import) kaydı tutar; stoku birleştirir; kopyayı soft-delete eder.
 *
 * Kullanım:
 *   npx tsx scripts/remove-duplicate-products.ts          # önizleme
 *   npx tsx scripts/remove-duplicate-products.ts --apply   # uygula
 */
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const apply = process.argv.includes('--apply')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

type ProductRow = {
  id: string
  slug: string
  name: string
  barcode: string | null
  category_slug: string | null
  subcategory_slug: string | null
  stock_quantity: number
  in_stock: boolean
  created_at: string
}

const MIGRATION_SLUG_RE = /-1769633\d{6}-/i

function scoreProduct(p: ProductRow): number {
  let score = 0

  if (!MIGRATION_SLUG_RE.test(p.slug)) score += 100
  if (p.subcategory_slug) score += 40
  if (p.category_slug && p.category_slug !== 'protez-tirnak') score += 20
  if (p.in_stock && p.stock_quantity > 0) score += 15
  score -= p.slug.length * 0.01

  return score
}

function pickKeeper(products: ProductRow[]): ProductRow {
  return [...products].sort((a, b) => scoreProduct(b) - scoreProduct(a))[0]
}

async function loadAllProducts(): Promise<ProductRow[]> {
  const pageSize = 1000
  let from = 0
  const all: ProductRow[] = []

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, slug, name, barcode, category_slug, subcategory_slug, stock_quantity, in_stock, created_at')
      .is('deleted_at', null)
      .not('barcode', 'is', null)
      .range(from, from + pageSize - 1)

    if (error) throw error
    const batch = (data || []) as ProductRow[]
    all.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return all
}

async function main() {
  const data = await loadAllProducts()

  const byBarcode = new Map<string, ProductRow[]>()
  for (const p of (data || []) as ProductRow[]) {
    const key = String(p.barcode).trim()
    if (!key) continue
    const list = byBarcode.get(key) ?? []
    list.push(p)
    byBarcode.set(key, list)
  }

  const actions: Array<{
    keeper: ProductRow
    remove: ProductRow
    mergedStock: number
  }> = []

  for (const [, items] of byBarcode) {
    if (items.length < 2) continue
    const keeper = pickKeeper(items)
    const mergedStock = Math.max(...items.map((p) => p.stock_quantity || 0))
    for (const p of items) {
      if (p.id !== keeper.id) {
        actions.push({ keeper, remove: p, mergedStock })
      }
    }
  }

  console.log(`Silinecek mükerrer: ${actions.length}`)
  console.log('')

  const pens = actions.filter((a) => /pen|pensi/i.test(a.remove.name) || /pen|pensi/i.test(a.keeper.name))
  if (pens.length) {
    console.log(`--- Pens/Pensi (${pens.length}) ---`)
    for (const { keeper, remove, mergedStock } of pens) {
      console.log(`TUT: ${keeper.name}`)
      console.log(`     ${keeper.slug} (stok ${keeper.stock_quantity} → ${mergedStock})`)
      console.log(`SİL: ${remove.slug} (stok ${remove.stock_quantity})`)
      console.log('')
    }
  }

  if (!apply) {
    console.log('Önizleme. Uygulamak için: npx tsx scripts/remove-duplicate-products.ts --apply')
    return
  }

  const now = new Date().toISOString()
  let done = 0

  for (const { keeper, remove, mergedStock } of actions) {
    const { error: keeperError } = await supabase
      .from('products')
      .update({
        stock_quantity: mergedStock,
        in_stock: mergedStock > 0,
        updated_at: now,
      })
      .eq('id', keeper.id)

    if (keeperError) throw keeperError

    const { error: removeError } = await supabase
      .from('products')
      .update({
        deleted_at: now,
        in_stock: false,
        stock_quantity: 0,
        updated_at: now,
      })
      .eq('id', remove.id)

    if (removeError) throw removeError
    done++
    if (done % 25 === 0) console.log(`İşlendi: ${done}/${actions.length}`)
  }

  console.log(`Tamamlandı. ${done} mükerrer ürün kaldırıldı.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
