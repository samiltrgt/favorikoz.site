#!/usr/bin/env tsx
/**
 * Product Migration Script: JSON to Supabase
 * 
 * This script migrates products from data/products.json to Supabase database
 * 
 * Usage: npx tsx scripts/migrate-to-supabase.ts
 */

import fs from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/supabase/database.types'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

interface OldProduct {
  id: string
  slug: string
  name: string
  brand?: string
  price: number
  originalPrice?: number
  discount?: number
  image?: string
  images?: string[]
  rating?: number
  reviews?: number
  isNew?: boolean
  isBestSeller?: boolean
  inStock?: boolean
  category?: string
  description?: string
  barcode?: string
  createdAt?: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ğüşöçİ]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function transformProduct(p: OldProduct): Database['public']['Tables']['products']['Insert'] {
  return {
    id: p.id, // Keep existing ID (TEXT format)
    slug: p.slug || slugify(p.name),
    name: p.name,
    brand: p.brand || null,
    price: Math.round(Number(p.price) * 100), // Convert to kuruş
    original_price: p.originalPrice ? Math.round(Number(p.originalPrice) * 100) : null,
    discount: p.discount ?? null,
    image: p.image || null,
    images: p.images || [],
    rating: p.rating ?? 0,
    reviews_count: p.reviews ?? 0,
    is_new: !!p.isNew,
    is_best_seller: !!p.isBestSeller,
    in_stock: p.inStock ?? true,
    category_slug: p.category || null,
    description: p.description || null,
    barcode: p.barcode || null,
  }
}

async function migrateProducts() {
  try {
    console.log('🚀 Starting product migration...\n')

    // Read products from JSON file
    const dataPath = path.join(process.cwd(), 'data', 'products.json')
    const rawData = await fs.readFile(dataPath, 'utf-8')
    const products: OldProduct[] = JSON.parse(rawData)

    console.log(`📦 Found ${products.length} products to migrate\n`)

    // Process in batches of 100
    const BATCH_SIZE = 100
    let successCount = 0
    let errorCount = 0
    const errors: Array<{ name: string; error: string }> = []

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)
      const transformedBatch = batch.map(transformProduct)

      const { data, error } = await supabase
        .from('products')
        .upsert(transformedBatch, {
          onConflict: 'id',
          ignoreDuplicates: false,
        })

      if (error) {
        console.error(`❌ Batch ${i / BATCH_SIZE + 1} error:`, error.message)
        errorCount += batch.length
        batch.forEach(p => errors.push({ name: p.name, error: error.message }))
      } else {
        successCount += batch.length
        console.log(`✅ Batch ${i / BATCH_SIZE + 1}: ${batch.length} products migrated`)
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   Total: ${products.length}`)
    console.log(`   Success: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)

    if (errors.length > 0 && errors.length < 20) {
      console.log('\n❌ Error details:')
      errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`))
    }

    console.log('\n✨ Migration completed!')
    
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

// Run migration
migrateProducts()

