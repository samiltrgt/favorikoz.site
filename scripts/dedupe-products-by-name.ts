import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { mkdirSync, writeFileSync } from 'node:fs'
import { planExcelDuplicates, type DedupeProduct } from './lib/excel-product-dedupe'

dotenv.config({ path: '.env.local', quiet: true })

async function loadProducts(supabase: ReturnType<typeof createClient>) {
  const products: DedupeProduct[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('products').select('*')
      .is('deleted_at', null).order('id').range(from, from + 999)
    if (error) throw error
    products.push(...(data || []) as DedupeProduct[])
    if ((data || []).length < 1000) return products
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } })
  const products = await loadProducts(supabase)
  const { actions, skippedGroups } = planExcelDuplicates(products)
  const duplicateIds = actions.flatMap(a => a.duplicates.map(p => p.id))
  console.log(JSON.stringify({ activeProducts: products.length, excelDuplicateGroups: actions.length,
    duplicates: duplicateIds.length, skippedVariantGroups: skippedGroups, apply }))
  for (const a of actions) console.log(`KEEP ${a.keeper.id} | ${a.keeper.name} | hide ${a.duplicates.length}`)
  if (!apply || !duplicateIds.length) return

  // Full records and the merge plan allow recovery without touching order history.
  mkdirSync('.pricing-backups', { recursive: true })
  const backup = `.pricing-backups/excel-dedupe-${Date.now()}.json`
  writeFileSync(backup, JSON.stringify({ products, actions }, null, 2))
  console.log(`Backup: ${backup}`)
  for (const { keeper, imageSource } of actions) {
    if (imageSource.id === keeper.id) continue
    const { data, error } = await supabase.from('products')
      .update({ image: imageSource.image, images: imageSource.images })
      .eq('id', keeper.id).is('deleted_at', null).select('id')
    if (error) throw error
    if (data?.length !== 1) throw new Error(`Keeper update failed: ${keeper.id}`)
  }
  const now = new Date().toISOString()
  const { data, error } = await supabase.from('products').update({ deleted_at: now, in_stock: false })
    .in('id', duplicateIds).is('deleted_at', null).select('id')
  if (error) throw error
  if (data?.length !== duplicateIds.length) throw new Error('Not all duplicate listings were hidden')
  const remaining = await loadProducts(supabase)
  if (planExcelDuplicates(remaining).actions.length) throw new Error('Excel duplicates remain')
  console.log(`Verified: ${data.length} duplicate listings hidden; ${remaining.length} active products; 0 Excel duplicate groups.`)
}

main().catch(error => { console.error(error); process.exitCode = 1 })
