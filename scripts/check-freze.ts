#!/usr/bin/env tsx
import * as dotenv from 'dotenv'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { data: frezeCat } = await supabase
    .from('categories')
    .select('slug,name,parent_slug,deleted_at')
    .eq('slug', 'freze-uclari')

  console.log('freze-uclari category:', frezeCat)

  const { data: tirnakSubs } = await supabase
    .from('categories')
    .select('slug,name,parent_slug')
    .eq('parent_slug', 'tirnak')
    .is('deleted_at', null)

  console.log('tirnak children:', tirnakSubs?.map((c) => c.slug).join(', '))

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('subcategory_slug', 'freze-uclari')
    .is('deleted_at', null)

  console.log('products with freze-uclari:', count)

  const { data: seramik } = await supabase
    .from('products')
    .select('name,subcategory_slug,category_slug,barcode')
    .ilike('name', '%Seramik%Freze%')
    .is('deleted_at', null)
    .limit(5)

  console.log('seramik sample:', seramik)

  const wb = XLSX.readFile('katliurun.xlsx')
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }) as any[]
  const frezeRows = rows.filter((r) => {
    const name = String(r['Ürün Adı'] || r['urun adi'] || '').toLowerCase()
    const alt = String(r['alt kategori kodu'] || r['Alt Kategori Kodu'] || '').toLowerCase()
    return name.includes('freze') || alt.includes('freze') || alt === 'j'
  })
  console.log('excel freze-related rows:', frezeRows.length)
  if (frezeRows.length) {
    const sample = frezeRows.slice(0, 3).map((r) => ({
      name: r['Ürün Adı'],
      alt: r['alt kategori kodu'] || r['Alt Kategori Kodu'],
      kategori: r['Kategori İsmi'] || r['kategori'],
    }))
    console.log('excel sample:', sample)
    const altVals: Record<string, number> = {}
    for (const r of frezeRows) {
      const alt = String(r['alt kategori kodu'] || r['Alt Kategori Kodu'] || '').trim()
      altVals[alt] = (altVals[alt] || 0) + 1
    }
    console.log('excel freze alt kategori values:', altVals)
  }

  const { data: frezeProducts } = await supabase
    .from('products')
    .select('name,subcategory_slug,category_slug')
    .ilike('name', '%freze%')
    .is('deleted_at', null)

  const bySub: Record<string, number> = {}
  for (const p of frezeProducts || []) {
    const key = p.subcategory_slug || '(none)'
    bySub[key] = (bySub[key] || 0) + 1
  }
  console.log('DB freze in name by subcategory:', bySub)
  console.log('total freze in name:', frezeProducts?.length)

  const { data: frezeUc } = await supabase
    .from('products')
    .select('name,subcategory_slug')
    .or('name.ilike.%freze uç%,name.ilike.%freze uc%')
    .is('deleted_at', null)

  const ucBySub: Record<string, number> = {}
  for (const p of frezeUc || []) {
    const key = p.subcategory_slug || '(none)'
    ucBySub[key] = (ucBySub[key] || 0) + 1
  }
  console.log('DB "freze uç" by subcategory:', ucBySub)

  const { data: sortRow } = await supabase
    .from('categories')
    .select('description')
    .eq('slug', '_menu_sort')
    .maybeSingle()
  const { data: torpuCat } = await supabase
    .from('categories')
    .select('slug,name,parent_slug')
    .eq('slug', 'torpu-freze-makinesi')
    .maybeSingle()
  console.log('torpu-freze-makinesi category:', torpuCat)

  const { data: frezeStock } = await supabase
    .from('products')
    .select('name,in_stock,stock_quantity')
    .eq('subcategory_slug', 'freze-uclari')
    .is('deleted_at', null)
  console.log(
    'freze stock:',
    frezeStock?.map((p) => ({ in_stock: p.in_stock, qty: p.stock_quantity }))
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
