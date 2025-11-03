/**
 * Bu script, veritabanındaki external URL'lerdeki görselleri
 * indirip Supabase Storage'a yükler ve URL'leri günceller
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import https from 'https'
import http from 'http'
import { URL } from 'url'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase environment variables eksik!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Download image from URL
async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`))
        return
      }

      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', reject)
    }).on('error', reject)
  })
}

// Get file extension from URL or content type
function getFileExtension(url: string, contentType?: string): string {
  // Try from content type
  if (contentType) {
    const mimeMatch = contentType.match(/image\/(jpeg|jpg|png|webp|gif)/)
    if (mimeMatch) {
      return mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1]
    }
  }

  // Try from URL
  const urlMatch = url.match(/\.(jpg|jpeg|png|webp|gif)/i)
  if (urlMatch) {
    return urlMatch[1].toLowerCase() === 'jpeg' ? 'jpg' : urlMatch[1].toLowerCase()
  }

  // Default
  return 'jpg'
}

// Upload image to Supabase Storage
async function uploadToStorage(
  buffer: Buffer,
  folder: string,
  fileName: string,
  contentType: string
): Promise<string> {
  const filePath = `${folder}/${fileName}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, buffer, {
      contentType,
      upsert: false
    })

  if (uploadError) {
    // If file already exists, try with different name
    if (uploadError.message?.includes('already exists')) {
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const newFileName = `${timestamp}_${randomString}.${fileName.split('.').pop()}`
      return uploadToStorage(buffer, folder, newFileName, contentType)
    }
    throw uploadError
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(uploadData.path)

  return urlData.publicUrl
}

// Migrate single product image
async function migrateProductImage(product: any, isMainImage: boolean = true): Promise<boolean> {
  const imageUrl = isMainImage ? product.image : null
  const imageField = isMainImage ? 'image' : 'images'

  if (!imageUrl) return false

  // Skip if already Supabase Storage URL
  if (imageUrl.includes('supabase.co/storage')) {
    console.log(`   ⏭️  Zaten Supabase Storage URL'si: ${product.name}`)
    return false
  }

  // Skip if URL is invalid
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    console.log(`   ⚠️  Geçersiz URL: ${product.name}`)
    return false
  }

  try {
    console.log(`   📥 İndiriliyor: ${imageUrl.substring(0, 60)}...`)

    // Download image
    const buffer = await downloadImage(imageUrl)

    // Get file extension
    const extension = getFileExtension(imageUrl)
    const contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}_${randomString}.${extension}`
    const folder = 'products'

    // Upload to Supabase Storage
    console.log(`   📤 Supabase Storage'a yükleniyor...`)
    const newUrl = await uploadToStorage(buffer, folder, fileName, contentType)

    // Update database
    if (isMainImage) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image: newUrl })
        .eq('id', product.id)

      if (updateError) {
        throw updateError
      }
    }

    console.log(`   ✅ Başarılı: ${product.name}`)
    console.log(`      Eski: ${imageUrl.substring(0, 60)}...`)
    console.log(`      Yeni: ${newUrl.substring(0, 60)}...`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Hata (${product.name}):`, error.message)
    return false
  }
}

// Main migration function
async function migrateImages() {
  console.log('🚀 Ürün görselleri Supabase Storage\'a migrate ediliyor...\n')

  // Get all products with images
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, image, images')
    .not('image', 'is', null)
    .order('created_at', { ascending: false })

  if (productsError) {
    console.error('❌ Ürünler alınamadı:', productsError)
    return
  }

  if (!products || products.length === 0) {
    console.log('⚠️  Migrate edilecek ürün bulunamadı.')
    return
  }

  console.log(`📦 Toplam ${products.length} ürün bulundu\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  // Process each product
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    console.log(`\n[${i + 1}/${products.length}] ${product.name}`)

    // Skip if already Supabase Storage URL
    if (product.image?.includes('supabase.co/storage')) {
      skipCount++
      console.log(`   ⏭️  Zaten Supabase Storage URL'si`)
      continue
    }

    // Migrate main image
    const success = await migrateProductImage(product, true)
    if (success) {
      successCount++
    } else if (product.image?.includes('supabase.co/storage')) {
      skipCount++
    } else {
      errorCount++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 MİGRATE ÖZETİ:')
  console.log(`   ✅ Başarılı: ${successCount}`)
  console.log(`   ⏭️  Atlanan: ${skipCount}`)
  console.log(`   ❌ Hatalı: ${errorCount}`)
  console.log(`   📦 Toplam: ${products.length}`)
  console.log('='.repeat(50))
}

// Run migration
migrateImages()
  .then(() => {
    console.log('\n✅ Migrate işlemi tamamlandı!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Migrate hatası:', error)
    process.exit(1)
  })

