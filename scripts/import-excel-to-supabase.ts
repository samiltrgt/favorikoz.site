#!/usr/bin/env tsx
// @ts-nocheck
/**
 * Excel to Supabase Import & Update Script
 * 
 * Bu script Excel dosyasından ürünleri okuyup Supabase'e ekler/günceller:
 * - Barcode varsa → Fiyat, stok ve kategori (alt kategori kodu) günceller
 * - Barcode yoksa → Yeni ürün ekler
 * - "Alt kategori kodu" sütunu: harf (a, b, …) veya Türkçe metin (örn. "tırnak süsleri")
 * - İç içe alt kategoriler (protez tırnak > tırnak süsleri) Supabase categories tablosundan eşlenir
 *
 * Kullanım: npx tsx scripts/import-excel-to-supabase.ts "C:\Users\Lenovo\Desktop\enyeni.xlsx"
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

// Alt kategori kodu (harf) → subcategory_slug. Sütun adı: "alt kategori kodu"
const LETTER_TO_SUBCATEGORY: Record<string, string> = {
  a: 'diger-ipek-kirpik-urunleri',
  b: 'ipek-kirpikler',
  c: 'cilt-bakimi',
  ç: 'kisisel-bakim-alt',
  d: 'diger-kuafor-malzemeleri',
  e: 'fon-makineleri',
  f: 'tiras-makineleri',
  g: 'sac-bakim',
  ğ: 'sac-fircasi-ve-tarak',
  h: 'sac-sekillendiriciler',
  ı: 'sac-topik',
  i: 'cihazlar',
  j: 'freze-uclari',
  k: 'jeller',
  l: 'kalici-oje',
  m: 'protez-tirnak-malzemeleri',
  n: 'tirnak-fircalari',
}
// subcategory_slug → category_slug (parent)
const SUBCATEGORY_TO_CATEGORY: Record<string, string> = {
  'diger-ipek-kirpik-urunleri': 'ipek-kirpik',
  'ipek-kirpikler': 'ipek-kirpik',
  'cilt-bakimi': 'kisisel-bakim',
  'kisisel-bakim-alt': 'kisisel-bakim',
  'diger-kuafor-malzemeleri': 'kuafor-malzemeleri',
  'fon-makineleri': 'kuafor-malzemeleri',
  'tiras-makineleri': 'kuafor-malzemeleri',
  'sac-bakim': 'sac-bakimi',
  'sac-fircasi-ve-tarak': 'sac-bakimi',
  'sac-sekillendiriciler': 'sac-bakimi',
  'sac-topik': 'sac-bakimi',
  'cihazlar': 'tirnak',
  'freze-uclari': 'tirnak',
  'jeller': 'tirnak',
  'kalici-oje': 'tirnak',
  'protez-tirnak-malzemeleri': 'tirnak',
  'tirnak-fircalari': 'tirnak',
  'tirnak-susleri': 'tirnak',
  'base-coat-top-coat': 'tirnak',
  'protez-tirnak-setleri': 'tirnak',
  'torpu-freze-makinesi': 'tirnak',
}

// A sütunundaki kategori metni (örn. "saç topik", "protez tırnak malzemeleri") → slug eşlemesi.
// Uzun slug önce kontrol edilir ki "saç" tek başına "sac-bakim"e gitmesin.
const SUBCATEGORY_SLUGS_BY_LENGTH = Object.keys(SUBCATEGORY_TO_CATEGORY).sort(
  (a, b) => b.length - a.length
)

// Excel'deki Türkçe alt kategori metinleri → slug (tam metin sütun için)
const DISPLAY_NAME_ALIASES: Record<string, string> = {
  'sac-sekillendirici': 'sac-sekillendiriciler',
  'sac-sekillendiriciler': 'sac-sekillendiriciler',
  'kisisel-bakim-alt': 'kisisel-bakim-alt',
  'kisisel-bakim': 'kisisel-bakim-alt',
  'freze-uclari': 'freze-uclari',
  'freze-ucu': 'freze-uclari',
  'torpu-freze-makinesi': 'torpu-freze-makinesi',
  'tirnak-fircalari': 'tirnak-fircalari',
  'tirnak-fircasi': 'tirnak-fircalari',
  'tirnak-susleri': 'tirnak-susleri',
  'tirnak-sus': 'tirnak-susleri',
  'base-coat-top-coat': 'base-coat-top-coat',
  'base-coat': 'base-coat-top-coat',
  'diger-tirnak-malzemeleri': 'protez-tirnak-malzemeleri',
  'diger-tirnak-malzeme': 'protez-tirnak-malzemeleri',
}

function getCategoryFromCategoryName(categoryRaw: string): { subcategorySlug: string; categorySlug: string } | null {
  if (!categoryRaw || String(categoryRaw).trim() === '') return null
  const slugified = slugify(String(categoryRaw).trim())
  if (!slugified) return null

  const aliasSlug = DISPLAY_NAME_ALIASES[slugified]
  if (aliasSlug) {
    const catSlug = SUBCATEGORY_TO_CATEGORY[aliasSlug]
    if (catSlug) return { subcategorySlug: aliasSlug, categorySlug: catSlug }
  }

  for (const subSlug of SUBCATEGORY_SLUGS_BY_LENGTH) {
    if (slugified === subSlug || slugified.includes(subSlug)) {
      const catSlug = SUBCATEGORY_TO_CATEGORY[subSlug]
      if (catSlug) return { subcategorySlug: subSlug, categorySlug: catSlug }
    }
    // "şaç şekillendirici" → sac-sekillendirici, slug: sac-sekillendiriciler
    if (slugified.length >= 8 && subSlug.includes(slugified)) {
      const catSlug = SUBCATEGORY_TO_CATEGORY[subSlug]
      if (catSlug) return { subcategorySlug: subSlug, categorySlug: catSlug }
    }
  }
  return null
}

type CategoryMatch = { subcategorySlug: string; categorySlug: string }

let dbCategoryLookup: Array<{ textKey: string; slug: string; rootSlug: string; name: string }> = []

async function loadDbCategories() {
  const { data: cats, error } = await supabase
    .from('categories')
    .select('slug, name, parent_slug')
    .is('deleted_at', null)

  if (error) throw error

  const bySlug = new Map((cats || []).map((c) => [c.slug, c]))

  function rootSlug(slug: string): string {
    let current = slug
    const seen = new Set<string>()
    while (true) {
      const row = bySlug.get(current)
      if (!row?.parent_slug || seen.has(current)) break
      seen.add(current)
      current = row.parent_slug
    }
    return current
  }

  const rows: typeof dbCategoryLookup = []
  for (const cat of cats || []) {
    if (!cat.parent_slug) continue
    const root = rootSlug(cat.slug)
    rows.push({ textKey: slugify(cat.name), slug: cat.slug, rootSlug: root, name: cat.name })
    rows.push({ textKey: cat.slug, slug: cat.slug, rootSlug: root, name: cat.name })
  }
  dbCategoryLookup = rows.sort((a, b) => b.textKey.length - a.textKey.length)

  const nested = (cats || []).filter((c) => {
    const parent = bySlug.get(c.parent_slug || '')
    return parent?.parent_slug != null
  })
  console.log(`📂 DB alt kategori: ${(cats || []).filter((c) => c.parent_slug).length} (iç içe: ${nested.length})`)
  if (nested.length) {
    console.log(`   İç içe örnek: ${nested.slice(0, 4).map((c) => c.name).join(', ')}\n`)
  } else {
    console.log('')
  }
}

function getCategoryFromDbName(categoryRaw: string): CategoryMatch | null {
  if (!categoryRaw || !dbCategoryLookup.length) return null
  const slugified = slugify(String(categoryRaw).trim())
  if (!slugified) return null

  for (const row of dbCategoryLookup) {
    if (slugified === row.textKey || slugified === row.slug) {
      return { subcategorySlug: row.slug, categorySlug: row.rootSlug }
    }
  }
  for (const row of dbCategoryLookup) {
    if (slugified.length >= 8 && (slugified.includes(row.textKey) || row.textKey.includes(slugified))) {
      return { subcategorySlug: row.slug, categorySlug: row.rootSlug }
    }
  }
  return null
}

let _warnedUnmappedLetter: Set<string> = new Set()

function getCategoryFromLetter(letter: string): { subcategorySlug: string; categorySlug: string } | null {
  const raw = String(letter).trim()
  let key = (raw.charAt(0) || raw).toLowerCase()
  if (!key) return null
  // Excel/JS: "İ".toLowerCase() → "i̇" (i + combining dot). Cihazlar için "i" kabul et.
  if (key === 'i̇' || key === '\u0069\u0307') key = 'i'
  // Tam genişlik veya j benzeri karakter → j (freze-uclari)
  if (key === '\uFF4A' || key.charCodeAt(0) === 0xFF4A) key = 'j'
  // "c" + birleşen cedilla (ç) veya Excel varyantı → ç (kisisel-bakim-alt)
  if (key === 'c\u0327' || key === '\u0063\u0327') key = 'ç'
  const sub = LETTER_TO_SUBCATEGORY[key]
  if (!sub) {
    if (!_warnedUnmappedLetter.has(key)) {
      _warnedUnmappedLetter.add(key)
      console.warn(`⚠️ Alt kategori kodu eşleşmedi: "${key}" (ham: "${raw}") – Bu harf map'te yok.`)
    }
    return null
  }
  const cat = SUBCATEGORY_TO_CATEGORY[sub]
  if (!cat) return null
  return { subcategorySlug: sub, categorySlug: cat }
}

const BLOCKED_IMAGE_HOSTS = ['chatgpt.com', 'openai.com']

function ensureHttps(url: string): string {
  if (!url) return ''
  const s = String(url).trim()
  if (s.startsWith('file://') || s.startsWith('file:/')) return ''
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('//')) return `https:${s}`
  return `https://${s}`
}

function isValidProductImageUrl(url: string): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (BLOCKED_IMAGE_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
      return false
    }
    return url.startsWith('http://') || url.startsWith('https://')
  } catch {
    return false
  }
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
  subcategorySlug?: string
  categorySlugFromSub?: string
  description: string
  stockQty: number
  inStock: boolean
  isNew: boolean
  isBestSeller: boolean
  image: string
  images: string[]
  imageRejected?: boolean
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
  const categoryRaw =
    pick(row, ['Kategori İsmi', 'kategori', 'category', 'kategori adı']) ??
    (Object.keys(row || {}).length > 0 ? row[Object.keys(row)[0]] : undefined)
  const category = normalizeCategory(categoryRaw)
  let altKategoriKodu = pick(row, ['alt kategori kodu', 'alt kategori', 'kategori kodu'])
  if (altKategoriKodu == null || altKategoriKodu === '') {
    const rowKeys = Object.keys(row || {})
    const altKey = rowKeys.find((k) => {
      const lower = String(k).toLowerCase().trim()
      return lower.includes('alt') && lower.includes('kategori') && (lower.includes('kod') || lower.includes('code'))
    })
    if (altKey) altKategoriKodu = row[altKey]
  }
  const altKodStr = altKategoriKodu != null ? String(altKategoriKodu).trim() : ''
  // Eğer sütunda tek harf varsa → harf eşlemesi, birden fazla karakter varsa → metin eşlemesi
  const letterMap = altKodStr.length === 1 ? getCategoryFromLetter(altKodStr) : null
  const dbMapFromAlt = altKodStr.length > 1 ? getCategoryFromDbName(altKodStr) : null
  const nameMapFromAlt = altKodStr.length > 1 && !dbMapFromAlt ? getCategoryFromCategoryName(altKodStr) : null
  const dbMapFromCat = getCategoryFromDbName(categoryRaw)
  const nameMapFromCat = !dbMapFromCat ? getCategoryFromCategoryName(categoryRaw) : null
  const subcategorySlug =
    letterMap?.subcategorySlug ??
    dbMapFromAlt?.subcategorySlug ??
    nameMapFromAlt?.subcategorySlug ??
    dbMapFromCat?.subcategorySlug ??
    nameMapFromCat?.subcategorySlug
  const categorySlugFromSub =
    letterMap?.categorySlug ??
    dbMapFromAlt?.categorySlug ??
    nameMapFromAlt?.categorySlug ??
    dbMapFromCat?.categorySlug ??
    nameMapFromCat?.categorySlug
  const description = pick(row, ['Ürün Açıklaması', 'açıklama', 'aciklama', 'description', 'detay']) || ''
  const stockQty = toNumber(pick(row, ['Ürün Stok Adedi', 'stok', 'stok miktarı', 'stok adedi', 'quantity', 'qty']))
  const inStock = stockQty > 0 || String(pick(row, ['stokta', 'stok durumu', 'in stock'])).toLowerCase().includes('var')
  const isNew = String(pick(row, ['yeni', 'new'])).toLowerCase().includes('evet') || false
  const isBestSeller = String(pick(row, ['çok satan', 'cok satan', 'bestseller'])).toLowerCase().includes('evet') || false
  
  const rawImage = ensureHttps(pick(row, [
    'Görsel 1',
    'görsel',
    'resim',
    'image',
    'image url',
    'foto'
  ]))
  const image = isValidProductImageUrl(rawImage)
    ? rawImage
    : 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop'
  const imageRejected = !!rawImage && !isValidProductImageUrl(rawImage)
  
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
      if (isValidProductImageUrl(cleanUrl)) images.push(cleanUrl)
    }
  }

  const discount = originalPrice && price ? Math.max(0, Math.round((1 - price / originalPrice) * 100)) : undefined

  return {
    name,
    brand,
    price,
    originalPrice: originalPrice || undefined,
    category,
    subcategorySlug,
    categorySlugFromSub,
    description,
    stockQty,
    inStock,
    isNew,
    isBestSeller,
    image,
    images,
    imageRejected,
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
  const withSub = products.filter((p) => p.subcategorySlug != null).length
  console.log(`📁 Alt kategori kodu okunan satır: ${withSub} / ${products.length}\n`)
  if (products.length > 0 && products[0].subcategorySlug) {
    console.log(`   Örnek: "${products[0].name?.slice(0, 40)}..." → ${products[0].categorySlugFromSub} / ${products[0].subcategorySlug}\n`)
  } else if (products.length > 0 && withSub === 0) {
    console.log(`   ⚠️ Hiçbir satırda alt kategori kodu eşleşmedi. Excel sütun adı "alt kategori kodu" mı? İlk satırda harf var mı?\n`)
  }
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
  let withSubcategoryCount = 0
  let rejectedImageCount = 0
  const errors: Array<{ name: string; error: string }> = []

  for (const product of products) {
    try {
      if (product.imageRejected) {
        rejectedImageCount++
        console.warn(`⚠️  Geçersiz görsel URL (ChatGPT vb.): ${product.name} — Excel'de Görsel 1 sütununu düzeltin`)
      }

      // 1. Barcode'a göre mevcut ürünü kontrol et (önce aktif, yoksa soft-delete)
      const { data: activeList, error: activeFindError } = await supabase
        .from('products')
        .select('id, barcode, price, original_price, created_at')
        .eq('barcode', product.barcode)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(1)

      if (activeFindError) {
        throw activeFindError
      }

      let existing = activeList && activeList.length > 0 ? activeList[0] : null

      if (!existing) {
        const { data: deletedList, error: deletedFindError } = await supabase
          .from('products')
          .select('id, barcode, price, original_price, created_at')
          .eq('barcode', product.barcode)
          .not('deleted_at', 'is', null)
          .order('created_at', { ascending: true })
          .limit(1)

        if (deletedFindError) {
          throw deletedFindError
        }

        existing = deletedList && deletedList.length > 0 ? deletedList[0] : null
      }

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
          deleted_at: null;
          category_slug?: string | null;
          subcategory_slug?: string | null;
          image?: string;
          images?: string[];
        } = {
          price: Math.round(product.price * 100), // TL → kuruş
          original_price: product.originalPrice ? Math.round(product.originalPrice * 100) : null,
          discount: product.discount ?? null,
          stock_quantity: product.stockQty,
          in_stock: isInStock,
          updated_at: new Date().toISOString(),
          deleted_at: null,
        }
        // Excel'de geçerli görsel varsa güncelle; yoksa panelden yükleneni koru
        if (!product.imageRejected && isValidProductImageUrl(product.image)) {
          updateData.image = product.image
          updateData.images = product.images
        }
        if (product.subcategorySlug != null && product.categorySlugFromSub != null) {
          updateData.category_slug = product.categorySlugFromSub
          updateData.subcategory_slug = product.subcategorySlug
          withSubcategoryCount++
        }

        const { error: updateError } = await (supabase
          .from('products')
          .update(updateData as any)
          .eq('id', existing.id) as any)

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

        const categorySlug = product.categorySlugFromSub ?? product.category
        const subcategorySlug = product.subcategorySlug ?? null
        if (product.subcategorySlug != null) withSubcategoryCount++
        const { error: insertError } = await (supabase
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
            is_new: product.isNew ?? true,
            is_best_seller: product.isBestSeller,
            in_stock: isInStock,
            stock_quantity: product.stockQty,
            category_slug: categorySlug,
            subcategory_slug: subcategorySlug,
            description: product.description,
            barcode: product.barcode,
          }) as any)

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
  console.log(`   📁 Alt kategori atanan: ${withSubcategoryCount}`)
  console.log(`   ⚠️  Geçersiz görsel URL: ${rejectedImageCount}`)
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
    await loadDbCategories()
    const products = readExcelFile(xlsxArg)
    await importToSupabase(products)
  } catch (error: any) {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  }
}

main()
