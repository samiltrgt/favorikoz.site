#!/usr/bin/env tsx
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  loadCategorySortConfig,
  saveCategorySortConfig,
} from '../src/lib/category-sort-config'

dotenv.config({ path: '.env.local' })

const slug = process.argv[2]
const reassignTo = process.argv[3]

if (!slug) {
  console.error('Kullanım: npx tsx scripts/remove-category.ts <slug> [yeni-alt-kategori-slug]')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const now = new Date().toISOString()

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id')
    .eq('subcategory_slug', slug)
    .is('deleted_at', null)

  if (prodErr) throw prodErr

  if (products?.length && reassignTo) {
    const { error } = await supabase
      .from('products')
      .update({ subcategory_slug: reassignTo, updated_at: now })
      .eq('subcategory_slug', slug)
      .is('deleted_at', null)
    if (error) throw error
    console.log(`${products.length} ürün → ${reassignTo}`)
  } else if (products?.length) {
    throw new Error(`${products.length} ürün var; hedef alt kategori belirtin`)
  }

  const { error: catErr } = await supabase
    .from('categories')
    .update({ deleted_at: now, updated_at: now })
    .eq('slug', slug)
    .is('deleted_at', null)

  if (catErr) throw catErr
  console.log(`Kategori soft-delete: ${slug}`)

  const config = await loadCategorySortConfig(supabase)
  for (const key of Object.keys(config)) {
    config[key] = config[key].filter((s) => s !== slug)
  }
  await saveCategorySortConfig(supabase, config)
  console.log('Menü sıralaması güncellendi')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
