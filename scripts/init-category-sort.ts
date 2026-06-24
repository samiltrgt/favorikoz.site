#!/usr/bin/env tsx
/**
 * Varsayılan menü sıralamasını yazar (_menu_sort kategorisi).
 * Kullanım: npx tsx scripts/init-category-sort.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import {
  ensureOrderIncludesSiblings,
  loadCategorySortConfig,
  saveCategorySortConfig,
  type CategorySortConfig,
} from '../src/lib/category-sort-config'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

async function siblingSlugs(parentSlug: string | null): Promise<string[]> {
  let query = supabase.from('categories').select('slug').is('deleted_at', null)

  query =
    parentSlug === null
      ? query.is('parent_slug', null)
      : query.eq('parent_slug', parentSlug)

  const { data, error } = await query
  if (error) throw error

  return (data || [])
    .map((row: { slug: string }) => row.slug)
    .filter((slug) => slug !== '_menu_sort')
}

async function main() {
  const config: CategorySortConfig = await loadCategorySortConfig(supabase)

  const tirnakSlugs = await siblingSlugs('tirnak')
  const preferredTirnak = ['protez-tirnak-setleri']
  const tirnakOrder = [
    ...preferredTirnak.filter((slug) => tirnakSlugs.includes(slug)),
    ...tirnakSlugs.filter((slug) => !preferredTirnak.includes(slug)),
  ]
  config.tirnak = ensureOrderIncludesSiblings(tirnakOrder, tirnakSlugs)

  await saveCategorySortConfig(supabase, config)

  console.log('Menu sort config saved.')
  console.log('tirnak:', config.tirnak.join(', '))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
