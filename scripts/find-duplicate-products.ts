#!/usr/bin/env tsx
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, barcode, category_slug, subcategory_slug, in_stock, stock_quantity, deleted_at')
    .is('deleted_at', null)
    .order('name')

  if (error) throw error

  const pens = (data || []).filter((p) => /pen|kalem/i.test(p.name))
  console.log(`Pen/kalem ürünleri: ${pens.length}\n`)
  for (const p of pens) {
    console.log(`${p.name}`)
    console.log(`  slug: ${p.slug} | barkod: ${p.barcode ?? '-'} | stok: ${p.stock_quantity}`)
    console.log(`  ${p.category_slug} / ${p.subcategory_slug ?? '-'}\n`)
  }

  const byName = new Map<string, typeof pens>()
  for (const p of data || []) {
    const key = p.name.trim().toLowerCase().replace(/\s+/g, ' ')
    const list = byName.get(key) ?? []
    list.push(p)
    byName.set(key, list)
  }

  console.log('=== Aynı isimli mükerrer ürünler ===')
  let dupCount = 0
  for (const [name, items] of byName) {
    if (items.length > 1) {
      dupCount++
      console.log(`\n${name} (${items.length} kayıt):`)
      for (const p of items) {
        console.log(`  - ${p.slug} | barkod: ${p.barcode ?? '-'} | stok: ${p.stock_quantity}`)
      }
    }
  }
  if (dupCount === 0) console.log('Yok')

  const byBarcode = new Map<string, typeof data>()
  for (const p of data || []) {
    if (!p.barcode) continue
    const key = String(p.barcode).trim()
    const list = byBarcode.get(key) ?? []
    list.push(p)
    byBarcode.set(key, list)
  }

  console.log('\n=== Aynı barkodlu mükerrer ürünler ===')
  dupCount = 0
  for (const [barcode, items] of byBarcode) {
    if ((items?.length ?? 0) > 1) {
      dupCount++
      console.log(`\nBarkod ${barcode} (${items!.length} kayıt):`)
      for (const p of items!) {
        console.log(`  - ${p.name} | ${p.slug} | stok: ${p.stock_quantity}`)
      }
    }
  }
  if (dupCount === 0) console.log('Yok')

  const activeDupBarcodes = [...byBarcode.values()].filter((items) => (items?.length ?? 0) > 1).length
  console.log(`\nAktif mükerrer barkod grubu: ${activeDupBarcodes}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
