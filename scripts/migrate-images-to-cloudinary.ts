#!/usr/bin/env tsx
// @ts-nocheck
/**
 * Products image migration to Cloudinary
 *
 * Bu script Supabase products tablosundaki image ve images alanlarını okuyup,
 * görselleri Cloudinary'e upload eder ve kayıtları Cloudinary URL'leri ile günceller.
 *
 * Çalıştırmadan önce .env.local içine şu değişkenleri ekleyin:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 *
 * Kullanım:
 *   npx tsx scripts/migrate-images-to-cloudinary.ts
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/supabase/database.types'
import * as dotenv from 'dotenv'
import { v2 as cloudinary } from 'cloudinary'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const cloudApiKey = process.env.CLOUDINARY_API_KEY
const cloudApiSecret = process.env.CLOUDINARY_API_SECRET

if (!cloudName || !cloudApiKey || !cloudApiSecret) {
  console.error('❌ Missing Cloudinary credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET')
  process.exit(1)
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: cloudApiKey,
  api_secret: cloudApiSecret,
})

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

function isCloudinaryUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.hostname.includes('res.cloudinary.com')
  } catch {
    return false
  }
}

async function uploadToCloudinary(src: string, publicIdPrefix: string): Promise<string | null> {
  if (!src) return null

  // Zaten Cloudinary ise tekrar upload etme
  if (isCloudinaryUrl(src)) return src

  try {
    const result = await cloudinary.uploader.upload(src, {
      folder: 'favorikoz/products',
      public_id: undefined,
      overwrite: false,
      unique_filename: true,
      resource_type: 'image',
      transformation: [{ fetch_format: 'auto', quality: 'auto' }],
      context: { source: publicIdPrefix },
    })

    return result.secure_url || result.url || null
  } catch (error: any) {
    console.error(`❌ Cloudinary upload failed for ${src}:`, error.message || error)
    return null
  }
}

async function migrateBatch(offset: number, limit: number): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, image, images')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('❌ Supabase fetch error:', error.message, error)
    throw error
  }

  if (!data || data.length === 0) return 0

  console.log(`\n📦 Processing batch offset=${offset}, count=${data.length}`)

  let updatedCount = 0

  for (const product of data) {
    const { id, name, image, images } = product as any

    const tasks: Array<Promise<string | null>> = []
    const newMainPromise = uploadToCloudinary(image, `product-${id}-main`)
    tasks.push(newMainPromise)

    const imageArray: string[] = Array.isArray(images) ? images : []
    const extraPromises = imageArray.map((img, idx) =>
      uploadToCloudinary(img, `product-${id}-extra-${idx}`)
    )
    tasks.push(...extraPromises)

    const [newMain, ...newExtras] = await Promise.all(tasks)

    const newImagesArray = newExtras.map((v, idx) => v || imageArray[idx]).filter(Boolean)

    // Hiçbir şey değişmediyse update atma
    const mainChanged = newMain && newMain !== image
    const extrasChanged =
      newImagesArray.length !== imageArray.length ||
      newImagesArray.some((v, idx) => v !== imageArray[idx])

    if (!mainChanged && !extrasChanged) {
      continue
    }

    const updatePayload: any = {}
    if (newMain) updatePayload.image = newMain
    if (newImagesArray.length > 0) updatePayload.images = newImagesArray

    const { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) {
      console.error(`❌ Failed to update product ${id} – ${name}:`, updateError.message)
      continue
    }

    updatedCount++
    console.log(
      `✅ Updated product ${id} – ${name?.slice(0, 40) || ''}... (${updatedCount} in this batch)`
    )
  }

  return data.length
}

async function main() {
  console.log('🚀 Starting product images migration to Cloudinary...\n')

  const batchSize = 50
  let offset = 0
  let totalProcessed = 0

  while (true) {
    const count = await migrateBatch(offset, batchSize)
    if (count === 0) break
    offset += count
    totalProcessed += count
  }

  console.log('\n============================================================')
  console.log('📊 IMAGE MIGRATION SUMMARY:')
  console.log('============================================================')
  console.log(`   Total products scanned: ${totalProcessed}`)
  console.log('   ✅ All possible images uploaded to Cloudinary and product records updated.')
  console.log('============================================================\n')
}

main().catch((err) => {
  console.error('💥 Fatal error during migration:', err)
  process.exit(1)
})

