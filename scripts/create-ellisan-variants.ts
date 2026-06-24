#!/usr/bin/env tsx
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const variants = [
  '#001',
  '#002',
  '#003',
  '#004',
  '#005',
  '#006',
  '#007',
  '#008',
  '#009',
  '#010',
  '#011',
  '#012',
  '#013',
  '#014',
  '#015',
  '#016',
  '#017',
  '#018',
  '#019',
  '#020(white)',
  '#0 (RAKI BEYAZI)',
  '#X01 Transparent (şeffaf)',
]

const BASE_NAME = 'Ellisan Protez Tırnak Builder Jel 56ml (TPO İçermez)'
const BASE_DESC = 'Ellisan Builder Gel 56 ml – Profesyonel Tırnak Yapı Jeli'
const BASE_IMAGE =
  'https://cdn.myikas.com/images/27541c2f-8d4e-4f4e-ade6-c463a33a3f11/3df694a0-be95-4c15-aa9f-b9d63ba14d0e/1512/goruntu.webp'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function main() {
  let added = 0
  let updated = 0
  const now = new Date().toISOString()

  for (const variant of variants) {
    const variantName = `${BASE_NAME} ${variant}`
    const code = variant.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'V'
    const barcode = `8690201381750-617-${code}`

    const { data: existing, error: findError } = await supabase
      .from('products')
      .select('id')
      .eq('barcode', barcode)
      .is('deleted_at', null)
      .maybeSingle()
    if (findError) throw findError

    const payload = {
      name: variantName,
      slug: `${slugify(variantName)}-${code.toLowerCase()}`,
      brand: 'Fontenay',
      price: 42000,
      original_price: 49990,
      discount: 16,
      image: BASE_IMAGE,
      images: [BASE_IMAGE],
      rating: 5,
      reviews_count: 0,
      is_new: true,
      is_best_seller: false,
      in_stock: true,
      stock_quantity: 100,
      category_slug: 'tirnak',
      subcategory_slug: 'ellisan-tirnak-jeli',
      description: BASE_DESC,
      barcode,
      deleted_at: null,
      updated_at: now,
    }

    if (existing?.id) {
      const { error } = await supabase.from('products').update(payload).eq('id', existing.id)
      if (error) throw error
      updated++
    } else {
      const id = `prod-ellisan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const { error } = await supabase
        .from('products')
        .insert({ id, created_at: now, ...payload })
      if (error) throw error
      added++
    }
  }

  console.log(`Added: ${added}, Updated: ${updated}, Total: ${variants.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

