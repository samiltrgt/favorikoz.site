import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await s
    .from('products')
    .select('id,name,barcode,slug,stock_quantity,in_stock,created_at,deleted_at')
    .is('deleted_at', null)
    .order('name')

  if (error) {
    console.error(error)
    process.exit(1)
  }

  console.log('Active products:', data?.length)

  const byBarcode = new Map<string, typeof data>()
  const byName = new Map<string, typeof data>()

  for (const p of data || []) {
    const b = (p.barcode || '').trim()
    if (b) {
      if (!byBarcode.has(b)) byBarcode.set(b, [])
      byBarcode.get(b)!.push(p)
    }
    const n = (p.name || '').trim().toLowerCase()
    if (!byName.has(n)) byName.set(n, [])
    byName.get(n)!.push(p)
  }

  const dupBarcode = [...byBarcode.entries()].filter(([, v]) => v.length > 1)
  const dupName = [...byName.entries()].filter(([, v]) => v.length > 1)

  console.log('Duplicate barcodes:', dupBarcode.length)
  console.log('Duplicate names:', dupName.length)

  console.log('\n--- Barcode duplicates ---')
  for (const [b, items] of dupBarcode.slice(0, 15)) {
    console.log(`Barkod: ${b} (${items.length}x)`)
    for (const p of items) {
      console.log(`  ${p.id} | stok: ${p.stock_quantity} | ${p.slug}`)
    }
  }

  console.log('\n--- Name duplicates (different barcode) ---')
  let shown = 0
  for (const [, items] of dupName) {
    const barcodes = new Set(items.map((p) => p.barcode || ''))
    if (barcodes.size <= 1) continue
    console.log(`Name: ${items[0].name.slice(0, 60)} (${items.length}x)`)
    for (const p of items) {
      console.log(`  ${p.barcode || '(no barcode)'} | stok: ${p.stock_quantity}`)
    }
    shown++
    if (shown >= 10) break
  }
}

main().catch(console.error)
