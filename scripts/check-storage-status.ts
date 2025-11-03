/**
 * Bu script, Supabase Storage'daki dosyaları ve veritabanındaki URL'leri karşılaştırır
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase environment variables eksik!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkStorageStatus() {
  console.log('🔍 Supabase Storage durumu kontrol ediliyor...\n')

  // 1. Bucket kontrolü
  console.log('1️⃣ BUCKET KONTROLÜ:')
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
  
  if (bucketError) {
    console.error('❌ Bucket listesi alınamadı:', bucketError)
    return
  }

  const imagesBucket = buckets?.find(b => b.id === 'images')
  if (!imagesBucket) {
    console.error('❌ "images" bucket bulunamadı!')
    console.log('💡 Çözüm: supabase-storage-fix.sql dosyasını Supabase SQL Editor\'da çalıştır.')
    return
  }
  
  console.log('✅ "images" bucket bulundu:', {
    id: imagesBucket.id,
    name: imagesBucket.name,
    public: imagesBucket.public,
    fileSizeLimit: imagesBucket.file_size_limit,
    allowedMimeTypes: imagesBucket.allowed_mime_types
  })
  console.log('')

  // 2. Storage'daki dosyaları listele
  console.log('2️⃣ STORAGE\'DAKİ DOSYALAR:')
  const { data: files, error: filesError } = await supabase.storage
    .from('images')
    .list('products', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    })

  if (filesError) {
    console.error('❌ Dosya listesi alınamadı:', filesError)
  } else {
    if (!files || files.length === 0) {
      console.log('⚠️  Storage\'da hiç dosya yok!')
      console.log('💡 Henüz hiç ürün fotoğrafı yüklenmemiş.')
    } else {
      console.log(`✅ ${files.length} dosya bulundu:`)
      files.slice(0, 10).forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name} (${(file.metadata?.size || 0) / 1024} KB)`)
      })
      if (files.length > 10) {
        console.log(`   ... ve ${files.length - 10} dosya daha`)
      }
    }
  }
  console.log('')

  // 3. Veritabanındaki ürünlerin image URL'lerini kontrol et
  console.log('3️⃣ VERİTABANINDAKİ ÜRÜN GÖRSELLERİ:')
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, image, images')
    .not('image', 'is', null)
    .limit(20)

  if (productsError) {
    console.error('❌ Ürünler alınamadı:', productsError)
    return
  }

  if (!products || products.length === 0) {
    console.log('⚠️  Veritabanında görseli olan ürün bulunamadı.')
    return
  }

  console.log(`✅ ${products.length} ürün bulundu (ilk 10):`)
  
  let supabaseStorageCount = 0
  let externalUrlCount = 0
  let missingFiles = 0

  products.slice(0, 10).forEach((product, index) => {
    const isSupabaseUrl = product.image?.includes('supabase.co/storage')
    const urlType = isSupabaseUrl ? '✅ Supabase Storage' : '⚠️  External URL'
    
    if (isSupabaseUrl) {
      supabaseStorageCount++
      // URL'den dosya adını çıkar
      const pathMatch = product.image.match(/\/storage\/v1\/object\/public\/images\/(.+)/)
      if (pathMatch) {
        const filePath = pathMatch[1]
        // Dosyanın gerçekten storage'da olup olmadığını kontrol et
        const fileExists = files?.some(f => filePath.includes(f.name))
        if (!fileExists) {
          missingFiles++
          console.log(`   ${index + 1}. ${product.name}`)
          console.log(`      ❌ URL var ama dosya storage'da yok: ${filePath}`)
        } else {
          console.log(`   ${index + 1}. ${product.name}`)
          console.log(`      ✅ ${urlType}: ${product.image.substring(0, 80)}...`)
        }
      }
    } else {
      externalUrlCount++
      console.log(`   ${index + 1}. ${product.name}`)
      console.log(`      ${urlType}: ${product.image?.substring(0, 80)}...`)
    }
  })
  console.log('')

  // 4. Özet
  console.log('📊 ÖZET:')
  console.log(`   Toplam ürün: ${products.length}`)
  console.log(`   ✅ Supabase Storage URL'leri: ${supabaseStorageCount}`)
  console.log(`   ⚠️  External URL'ler: ${externalUrlCount}`)
  console.log(`   ❌ Eksik dosyalar: ${missingFiles}`)
  console.log('')

  // 5. Öneriler
  if (missingFiles > 0) {
    console.log('💡 ÖNERİLER:')
    console.log('   - Eksik dosyalar var. Bu ürünlerin görsellerini tekrar yükleyin.')
    console.log('   - Admin panelden ürünü düzenleyip görseli tekrar yükleyin.')
  }
  
  if (externalUrlCount > 0) {
    console.log('💡 ÖNERİLER:')
    console.log('   - External URL\'ler kullanılıyor (Cloudinary, CDN vb.)')
    console.log('   - Bu görselleri Supabase Storage\'a migrate etmek için:')
    console.log('     1. Admin panelden ürünü aç')
    console.log('     2. Görseli tekrar yükle (ImageUpload component\'i kullan)')
    console.log('     3. Kaydet')
  }

  if (supabaseStorageCount === products.length && missingFiles === 0) {
    console.log('✅ Mükemmel! Tüm görseller Supabase Storage\'da ve erişilebilir.')
  }
}

checkStorageStatus()
  .then(() => {
    console.log('\n✅ Kontrol tamamlandı.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Hata:', error)
    process.exit(1)
  })

