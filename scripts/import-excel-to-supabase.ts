#!/usr/bin/env tsx
/**
 * Excel'den Supabase'e Ürün İçe Aktarma Scripti
 * 
 * Bu script Excel dosyasından ürünleri okuyup Supabase veritabanına ekler veya günceller.
 * - Yeni ürünleri ekler
 * - Mevcut ürünlerin fiyatlarını günceller (barkod veya ürün adına göre)
 * 
 * Kullanım: npx tsx scripts/import-excel-to-supabase.ts "C:\path\to\file.xlsx"
 */

import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/supabase/database.types'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase kimlik bilgileri eksik (.env.local dosyasında)')
  console.error('Gerekli: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

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
  const lower: any = {}
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

function normalizeCategory(cat: any): string {
  if (!cat) return 'kisisel-bakim'
  const s = slugify(String(cat))
  const map: Record<string, string> = {
    'protez-tirnak': 'protez-tirnak',
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
  if (s.includes('tirnak')) return 'protez-tirnak'
  if (s.includes('erkek')) return 'erkek-bakim'
  if (s.includes('kuafor') || s.includes('guzellik')) return 'kuafor-guzellik'
  return 'kisisel-bakim'
}

function ensureHttps(url: any): string {
  if (!url) return ''
  const s = String(url).trim()
  if (s.startsWith('http')) return s
  return s
}

interface ExcelProduct {
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
}

async function importExcelToSupabase(xlsxPath: string) {
  try {
    console.log('📖 Excel dosyası okunuyor...')
    const wb = XLSX.readFile(xlsxPath)
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    console.log(`📊 ${rows.length} satır bulundu\n`)

    const products: ExcelProduct[] = []
    const errors: Array<{ row: number; name: string; error: string }> = []

    // Excel'den ürünleri parse et
    rows.forEach((row: any, idx: number) => {
      try {
        const name = pick(row, ['Ürün Adı', 'ürün adı', 'urun adi', 'urun adı', 'ad', 'isim', 'product name', 'name']) || ''
        if (!name) return

        const brand = pick(row, ['Marka', 'marka', 'brand']) || 'Favori'
        const price = toNumber(pick(row, ['Trendyol\'da Satılacak Fiyat (KDV Dahil)', 'trendyol satış fiyatı', 'trendyol satis fiyati', 'trendyol satış fiyat', 'trendyol satis fiyat', 'trendyol fiyat', 'trendyol', 'fiyat', 'price', 'satis fiyati', 'satış fiyatı']))
        const originalPrice = toNumber(pick(row, ['Piyasa Satış Fiyatı (KDV Dahil)', 'liste fiyatı', 'liste fiyati', 'eski fiyat', 'original price']))
        const categoryRaw = pick(row, ['Kategori İsmi', 'kategori', 'category', 'kategori adı'])
        const category = normalizeCategory(categoryRaw)
        const description = pick(row, ['Ürün Açıklaması', 'açıklama', 'aciklama', 'description', 'detay']) || ''
        const stockQty = toNumber(pick(row, ['Ürün Stok Adedi', 'stok', 'stok miktarı', 'stok adedi', 'quantity', 'qty']))
        const inStock = stockQty > 0 || String(pick(row, ['stokta', 'stok durumu', 'in stock'])).toLowerCase().includes('var')
        const isNew = String(pick(row, ['yeni', 'new'])).toLowerCase().includes('evet') || false
        const isBestSeller = String(pick(row, ['çok satan', 'cok satan', 'bestseller'])).toLowerCase().includes('evet') || false
        const image = ensureHttps(pick(row, ['Görsel 1', 'görsel', 'resim', 'image', 'image url', 'foto'])) || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop'
        const barcode = pick(row, ['Barkod', 'barkod', 'barcode', 'kod', 'code', 'sku', 'ürün kodu', 'urun kodu']) || ''

        // Ek görselleri topla
        const additionalImages: string[] = []
        for (let i = 2; i <= 8; i++) {
          const imageValue = pick(row, [`Görsel ${i}`])
          if (imageValue) {
            const cleanUrl = ensureHttps(imageValue)
            if (cleanUrl) {
              additionalImages.push(cleanUrl)
            }
          }
        }

        if (!price || price <= 0) {
          errors.push({ row: idx + 2, name, error: 'Fiyat eksik veya geçersiz' })
          return
        }

        products.push({
          name,
          brand,
          price,
          originalPrice: originalPrice > 0 ? originalPrice : undefined,
          category,
          description,
          stockQty,
          inStock,
          isNew,
          isBestSeller,
          image,
          images: additionalImages,
          barcode: barcode || `FK${String(idx + 1).padStart(6, '0')}`,
        })
      } catch (error: any) {
        errors.push({ row: idx + 2, name: pick(row, ['name', 'ad', 'ürün adı']) || 'Bilinmeyen', error: error.message })
      }
    })

    console.log(`✅ ${products.length} ürün parse edildi`)
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} hata oluştu:\n`)
      errors.slice(0, 10).forEach(e => {
        console.log(`   Satır ${e.row}: ${e.name} - ${e.error}`)
      })
      if (errors.length > 10) {
        console.log(`   ... ve ${errors.length - 10} hata daha`)
      }
      console.log()
    }

    // Mevcut ürünleri kontrol et (barkod ve isim bazında)
    console.log('🔍 Mevcut ürünler kontrol ediliyor...')
    const existingProductsMap = new Map<string, Database['public']['Tables']['products']['Row']>()
    const existingProductsById = new Map<string, Database['public']['Tables']['products']['Row']>()
    
    // Önce tüm ürünleri çek (barkod ve isim bazında eşleştirme için)
    // Barkod bazında kontrol
    const barcodes = products.map(p => String(p.barcode).trim()).filter(b => b && !b.startsWith('FK'))
    if (barcodes.length > 0) {
      // Batch olarak kontrol et
      const BATCH_SIZE = 100
      for (let i = 0; i < barcodes.length; i += BATCH_SIZE) {
        const batch = barcodes.slice(i, i + BATCH_SIZE)
        const { data: productsByBarcode } = await supabase
          .from('products')
          .select('*')
          .in('barcode', batch)
          .is('deleted_at', null)
        
        if (productsByBarcode) {
          productsByBarcode.forEach((p: Database['public']['Tables']['products']['Row']) => {
            if (p.barcode) {
              const normalizedBarcode = String(p.barcode).trim()
              existingProductsMap.set(`barcode:${normalizedBarcode}`, p)
              existingProductsById.set(p.id, p)
            }
          })
        }
      }
    }

    // İsim bazında kontrol (barkod yoksa veya eşleşme bulunamadıysa)
    const productsWithoutBarcode = products.filter(p => {
      const barcode = String(p.barcode || '').trim()
      return !barcode || barcode.startsWith('FK') || !existingProductsMap.has(`barcode:${barcode}`)
    })
    const productNames = [...new Set(productsWithoutBarcode.map(p => p.name.trim()))]
    
    if (productNames.length > 0) {
      // Batch olarak kontrol et (Supabase'in limiti var)
      const BATCH_SIZE = 100
      for (let i = 0; i < productNames.length; i += BATCH_SIZE) {
        const batch = productNames.slice(i, i + BATCH_SIZE)
        const { data: productsByName } = await supabase
          .from('products')
          .select('*')
          .in('name', batch)
          .is('deleted_at', null)
        
        if (productsByName) {
          productsByName.forEach((p: Database['public']['Tables']['products']['Row']) => {
            const normalizedName = String(p.name).trim()
            if (!existingProductsMap.has(`name:${normalizedName}`)) {
              existingProductsMap.set(`name:${normalizedName}`, p)
              existingProductsById.set(p.id, p)
            }
          })
        }
      }
    }

    const barcodeCount = [...existingProductsMap.keys()].filter(k => k.startsWith('barcode:')).length
    const nameCount = [...existingProductsMap.keys()].filter(k => k.startsWith('name:')).length
    
    console.log(`📦 ${existingProductsMap.size} mevcut ürün bulundu`)
    console.log(`   - Barkod bazında: ${barcodeCount}`)
    console.log(`   - İsim bazında: ${nameCount}\n`)

    // Ürünleri Supabase formatına dönüştür ve upsert yap
    const productsToUpsert: Database['public']['Tables']['products']['Insert'][] = []
    let newCount = 0
    let updateCount = 0

    for (const product of products) {
      // Mevcut ürünü bul (önce barkod, sonra isim bazında)
      let existingProduct: Database['public']['Tables']['products']['Row'] | undefined
      
      // Barkod bazında ara (normalize edilmiş)
      const normalizedBarcode = String(product.barcode || '').trim()
      if (normalizedBarcode && !normalizedBarcode.startsWith('FK')) {
        existingProduct = existingProductsMap.get(`barcode:${normalizedBarcode}`)
      }
      
      // Eğer barkod ile bulunamadıysa, isim bazında ara
      if (!existingProduct) {
        const normalizedName = product.name.trim()
        existingProduct = existingProductsMap.get(`name:${normalizedName}`)
      }

      // Slug ve ID oluştur
      const baseSlug = slugify(product.name)
      const uniqueSlug = existingProduct 
        ? existingProduct.slug 
        : `${baseSlug}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

      // Mevcut ürün varsa onun ID'sini kullan, yoksa yeni ID oluştur
      const productId = existingProduct?.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Discount hesapla
      const discount = product.originalPrice && product.price 
        ? Math.max(0, Math.round((1 - product.price / product.originalPrice) * 100))
        : null

      const dbProduct: Database['public']['Tables']['products']['Insert'] = {
        id: productId,
        slug: uniqueSlug,
        name: product.name,
        brand: product.brand || null,
        price: Math.round(product.price * 100), // TL → Kuruş
        original_price: product.originalPrice ? Math.round(product.originalPrice * 100) : null,
        discount: discount && discount > 0 && discount <= 100 ? discount : null,
        image: product.image || null,
        images: product.images || [],
        rating: existingProduct?.rating || 4.6,
        reviews_count: existingProduct?.reviews_count || Math.floor(Math.random() * 150) + 5,
        is_new: product.isNew,
        is_best_seller: product.isBestSeller,
        in_stock: product.inStock,
        stock_quantity: product.stockQty || 300,
        category_slug: product.category || null,
        description: product.description || null,
        barcode: product.barcode || null,
      }

      productsToUpsert.push(dbProduct)
      
      if (existingProduct) {
        updateCount++
        // Debug: İlk birkaç güncellemeyi göster
        if (updateCount <= 3) {
          console.log(`   🔄 Güncellenecek: ${product.name} (ID: ${existingProduct.id}, Eski fiyat: ${existingProduct.price / 100} TL → Yeni fiyat: ${product.price} TL)`)
        }
      } else {
        newCount++
      }
    }

    console.log(`\n📝 ${newCount} yeni ürün, ${updateCount} güncelleme\n`)

    // Batch olarak Supabase'e yaz
    const BATCH_SIZE = 100
    let successCount = 0
    let errorCount = 0
    const upsertErrors: Array<{ name: string; error: string }> = []

    for (let i = 0; i < productsToUpsert.length; i += BATCH_SIZE) {
      const batch = productsToUpsert.slice(i, i + BATCH_SIZE)
      
      const { data, error } = await supabase
        .from('products')
        // @ts-expect-error - Supabase type inference issue with TEXT id field
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false,
        })

      if (error) {
        console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} hatası:`, error.message)
        errorCount += batch.length
        batch.forEach(p => upsertErrors.push({ name: p.name || 'Bilinmeyen', error: error.message }))
      } else {
        successCount += batch.length
        console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} ürün işlendi`)
      }
    }

    console.log('\n📊 Özet:')
    console.log(`   Toplam: ${products.length}`)
    console.log(`   Yeni: ${newCount}`)
    console.log(`   Güncelleme: ${updateCount}`)
    console.log(`   Başarılı: ${successCount}`)
    console.log(`   Hata: ${errorCount}`)

    if (upsertErrors.length > 0 && upsertErrors.length < 20) {
      console.log('\n❌ Hata detayları:')
      upsertErrors.forEach(e => console.log(`   - ${e.name}: ${e.error}`))
    }

    console.log('\n✨ İçe aktarma tamamlandı!')
    
  } catch (error) {
    console.error('💥 Kritik hata:', error)
    process.exit(1)
  }
}

// Script'i çalıştır
const xlsxArg = process.argv[2]
if (!xlsxArg) {
  console.error('❌ Excel dosyası yolu belirtilmedi!')
  console.error('Kullanım: npx tsx scripts/import-excel-to-supabase.ts "C:\\path\\to\\file.xlsx"')
  process.exit(1)
}

// Dosya yolunu normalize et (Windows path handling)
let normalizedPath = path.resolve(xlsxArg)

// Eğer dosya bulunamazsa, alternatif yolları dene
if (!fs.existsSync(normalizedPath)) {
  // Orijinal yolu da dene
  if (fs.existsSync(xlsxArg)) {
    normalizedPath = xlsxArg
  } else {
    // Proje klasöründe de ara
    const projectPath = path.join(process.cwd(), path.basename(xlsxArg))
    if (fs.existsSync(projectPath)) {
      normalizedPath = projectPath
    } else {
      // data klasöründe ara
      const dataPath = path.join(process.cwd(), 'data', path.basename(xlsxArg))
      if (fs.existsSync(dataPath)) {
        normalizedPath = dataPath
      } else {
        console.error(`❌ Dosya bulunamadı: ${normalizedPath}`)
        console.error(`   Denenen yol: ${xlsxArg}`)
        console.error(`   Denenen yol: ${projectPath}`)
        console.error(`   Denenen yol: ${dataPath}`)
        console.error('\n💡 İpucu:')
        console.error('   1. Dosya yolunu tırnak işaretleri içinde verdiğinizden emin olun.')
        console.error('   2. Dosyayı proje klasörüne kopyalayıp tekrar deneyin.')
        process.exit(1)
      }
    }
  }
}

console.log(`📁 Dosya bulundu: ${normalizedPath}\n`)
importExcelToSupabase(normalizedPath)
