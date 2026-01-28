#!/usr/bin/env tsx
/**
 * Excel to Supabase Import & Update Script
 * 
 * Bu script Excel dosyasından ürünleri okuyup Supabase'e ekler/günceller:
 * - Barcode varsa → Fiyat ve stok günceller
 * - Barcode yoksa → Yeni ürün ekler
 * 
 * Kullanım: npx tsx scripts/import-excel-to-supabase.ts "C:\path\to\file.xlsx"
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/supabase/database.types'
import * as dotenv from 'dotenv'
import * as XLSX from 'xlsx'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

function slugify(str: string): string {
  if (!str) return ''
  return String(str)
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

function toNumber(v: any): number {
  if (typeof v === 'number') return v
  if (!v) return 0
  const s = String(v).replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(/,/g, '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function pick(row: any, keys: string[]): any {
  const lower: Record<string, any> = {}
  for (const k of Object.keys(row)) lower[k.toLowerCase()] = row[k]
  for (const key of keys) {
    const k = key.toLowerCase()
    if (Object.prototype.hasOwnProperty.call(lower, k)) return lower[k]
  }
  for (const k of Object.keys(lower)) {
    if (keys.some(w => k.includes(w.toLowerCase()))) return lower[k]
  }
  return undefined
}

function normalizeCategory(cat: string): string {
  if (!cat) return 'kisisel-bakim'
  const s = slugify(String(cat))
  const map: Record<string, string> = {
    'protez-tirnak': 'tirnak', // ✅ Güncellenmiş mapping
    'tirnak': 'tirnak',
    'kalici-makyaj': 'kalici-makyaj',
    'ipek-kirpik': 'ipek-kirpik',
    'kisisel-bakim': 'kisisel-bakim',
    'makyaj': 'ipek-kirpik',
    'sac-bakimi': 'sac-bakimi',
    'erkek-bakim': 'erkek-bakim',
    'kuafor-guzellik': 'kuafor-guzellik',
  }
  for (const key of Object.keys(map)) {
    if (s.includes(key)) return map[key]
  }
  if (s.includes('sac')) return 'sac-bakimi'
  if (s.includes('tirnak')) return 'tirnak' // ✅ Güncellendi
  if (s.includes('erkek')) return 'erkek-bakim'
  if (s.includes('kuafor') || s.includes('guzellik')) return 'kuafor-guzellik'
  return 'kisisel-bakim'
}

function ensureHttps(url: string): string {
  if (!url) return ''
  const s = String(url).trim()
  if (s.startsWith('http')) return s
  return s
}

// ============================================
// EXCEL OKUMA VE PARSE
// ============================================

interface ParsedProduct {
  name: string
  brand: string
  price: number
  originalPrice?: number
  category: string
  description: string
  stockQty: number
  inStock: boolean
  isNew: boolean
  isBestSeller: boolean
  image: string
  images: string[]
  barcode: string
  rating: number
  reviews: number
  discount?: number
}

function parseExcelRow(row: any, idx: number): ParsedProduct | null {
  const name = pick(row, ['Ürün Adı', 'ürün adı', 'urun adi', 'urun adı', 'ad', 'isim', 'product name', 'name']) || ''
  if (!name) return null

  const brand = pick(row, ['Marka', 'marka', 'brand']) || 'Favori'
  const price = toNumber(pick(row, [
    'Trendyol\'da Satılacak Fiyat (KDV Dahil)',
    'trendyol satış fiyatı',
    'trendyol satis fiyati',
    'trendyol satış fiyat',
    'trendyol satis fiyat',
    'trendyol fiyat',
    'trendyol',
    'fiyat',
    'price',
    'satis fiyati',
    'satış fiyatı'
  ]))
  const originalPrice = toNumber(pick(row, [
    'Piyasa Satış Fiyatı (KDV Dahil)',
    'liste fiyatı',
    'liste fiyati',
    'eski fiyat',
    'original price'
  ]))
  const categoryRaw = pick(row, ['Kategori İsmi', 'kategori', 'category', 'kategori adı'])
  const category = normalizeCategory(categoryRaw)
  const description = pick(row, ['Ürün Açıklaması', 'açıklama', 'aciklama', 'description', 'detay']) || ''
  const stockQty = toNumber(pick(row, ['Ürün Stok Adedi', 'stok', 'stok miktarı', 'stok adedi', 'quantity', 'qty']))
  const inStock = stockQty > 0 || String(pick(row, ['stokta', 'stok durumu', 'in stock'])).toLowerCase().includes('var')
  const isNew = String(pick(row, ['yeni', 'new'])).toLowerCase().includes('evet') || false
  const isBestSeller = String(pick(row, ['çok satan', 'cok satan', 'bestseller'])).toLowerCase().includes('evet') || false
  
  const image = ensureHttps(pick(row, [
    'Görsel 1',
    'görsel',
    'resim',
    'image',
    'image url',
    'foto'
  ])) || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop'
  
  const barcode = pick(row, [
    'Barkod',
    'barkod',
    'barcode',
    'kod',
    'code',
    'sku',
    'ürün kodu',
    'urun kodu'
  ]) || ''

  // Ek görseller (Görsel 2-8)
  const images: string[] = []
  for (let i = 2; i <= 8; i++) {
    const imageValue = pick(row, [`Görsel ${i}`])
    if (imageValue) {
      const cleanUrl = ensureHttps(imageValue)
      if (cleanUrl) images.push(cleanUrl)
    }
  }

  const discount = originalPrice && price ? Math.max(0, Math.round((1 - price / originalPrice) * 100)) : undefined

  return {
    name,
    brand,
    price,
    originalPrice: originalPrice || undefined,
    category,
    description,
    stockQty,
    inStock,
    isNew,
    isBestSeller,
    image,
    images,
    barcode: barcode || `FK${String(idx + 1).padStart(6, '0')}`,
    rating: 4.6,
    reviews: Math.floor(Math.random() * 150) + 5,
    discount,
  }
}

function readExcelFile(xlsxPath: string): ParsedProduct[] {
  console.log(`📂 Reading Excel file: ${xlsxPath}\n`)
  
  const wb = XLSX.readFile(xlsxPath)
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  console.log(`📊 Found ${rows.length} rows in Excel\n`)

  const products: ParsedProduct[] = []
  rows.forEach((row, idx) => {
    const product = parseExcelRow(row, idx)
    if (product) products.push(product)
  })

  console.log(`✅ Parsed ${products.length} valid products\n`)
  return products
}

// ============================================
// SUPABASE IMPORT/UPDATE LOGİĞİ
// ============================================

async function importToSupabase(products: ParsedProduct[]) {
  console.log('🚀 Starting Supabase import/update...\n')

  let newCount = 0
  let updateCount = 0
  let errorCount = 0
  const errors: Array<{ name: string; error: string }> = []

  for (const product of products) {
    try {
      // 1. Barcode'a göre mevcut ürünü kontrol et (birden fazla varsa en eskisini al)
      const { data: existingList, error: findError } = await supabase
        .from('products')
        .select('id, barcode, price, original_price, created_at')
        .eq('barcode', product.barcode)
        .order('created_at', { ascending: true })
        .limit(1)

      if (findError) {
        throw findError
      }

      const existing = existingList && existingList.length > 0 ? existingList[0] : null

      if (existing) {
        // ✅ ÜRÜN VAR → Fiyat ve stok güncelle
        // Tip: Help TypeScript know what type to expect for update and query
        // Explicitly type the update object to help TypeScript
        // Stok kontrolü: Stok 0 ise otomatik olarak in_stock = false
        const isInStock = product.stockQty > 0 ? product.inStock : false
        
        const updateData: {
          price: number;
          original_price: number | null;
          discount: number | null;
          stock_quantity: number;
          in_stock: boolean;
          updated_at: string;
        } = {
          price: Math.round(product.price * 100), // TL → kuruş
          original_price: product.originalPrice ? Math.round(product.originalPrice * 100) : null,
          discount: product.discount ?? null,
          stock_quantity: product.stockQty,
          in_stock: isInStock, // Stok 0 ise otomatik false, >0 ise Excel'deki değer
          updated_at: new Date().toISOString(),
        };

        // Explicitly declare the type for the update to avoid 'never' error
        // @ts-ignore - Supabase tip sistemi karmaşık, runtime'da çalışıyor
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', existing.id)

        if (updateError) {
          throw updateError
        }

        console.log(`🔄 Updated: ${product.name} (${product.barcode})`)
        updateCount++
      } else {
        // ✨ YENİ ÜRÜN → Ekle
        const id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const slug = `${slugify(product.name)}-${id.split('-').pop()}`
        
        // Stok kontrolü: Stok 0 ise otomatik olarak in_stock = false
        const isInStock = product.stockQty > 0 ? product.inStock : false

        // @ts-ignore - Supabase tip sistemi karmaşık, runtime'da çalışıyor
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            id,
            slug,
            name: product.name,
            brand: product.brand,
            price: Math.round(product.price * 100), // TL → kuruş
            original_price: product.originalPrice ? Math.round(product.originalPrice * 100) : null,
            discount: product.discount ?? null,
            image: product.image,
            images: product.images,
            rating: product.rating,
            reviews_count: product.reviews,
            is_new: product.isNew,
            is_best_seller: product.isBestSeller,
            in_stock: isInStock, // Stok 0 ise otomatik false, >0 ise Excel'deki değer
            stock_quantity: product.stockQty,
            category_slug: product.category,
            description: product.description,
            barcode: product.barcode,
          })

        if (insertError) {
          throw insertError
        }

        console.log(`✨ Added: ${product.name} (${product.barcode})`)
        newCount++
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${product.name}:`, error.message)
      errorCount++
      errors.push({ name: product.name, error: error.message })
    }
  }

  // Özet
  console.log('\n' + '='.repeat(60))
  console.log('📊 IMPORT SUMMARY:')
  console.log('='.repeat(60))
  console.log(`   Total products:  ${products.length}`)
  console.log(`   ✨ New added:     ${newCount}`)
  console.log(`   🔄 Updated:       ${updateCount}`)
  console.log(`   ❌ Errors:        ${errorCount}`)
  console.log('='.repeat(60))

  if (errors.length > 0 && errors.length < 10) {
    console.log('\n❌ Error details:')
    errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`))
  }

  console.log('\n✅ Import completed!\n')
}

// ============================================
// MAIN
// ============================================

async function main() {
  const xlsxArg = process.argv[2]
  if (!xlsxArg) {
    console.error('❌ Usage: npx tsx scripts/import-excel-to-supabase.ts "C:\\path\\to\\file.xlsx"')
    process.exit(1)
  }

  try {
    const products = readExcelFile(xlsxArg)
    await importToSupabase(products)
  } catch (error: any) {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  }
}

main()
