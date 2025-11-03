/**
 * Bu script, veritabanındaki ürün görsellerinin kaynağını kontrol eder
 * Cloudinary URL'leri tespit eder ve Supabase Storage URL'lerine geçiş için hazırlık yapar
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

async function checkImageSources() {
  console.log('🔍 Veritabanındaki görsel kaynaklarını kontrol ediliyor...\n')

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image, images')
    .not('image', 'is', null)

  if (error) {
    console.error('❌ Hata:', error)
    return
  }

  if (!products || products.length === 0) {
    console.log('ℹ️  Veritabanında ürün bulunamadı.')
    return
  }

  let cloudinaryCount = 0
  let supabaseCount = 0
  let otherCount = 0
  const cloudinaryUrls: Array<{ id: string; name: string; url: string }> = []

  products.forEach((product) => {
    // Check main image
    if (product.image) {
      if (product.image.includes('cloudinary.com')) {
        cloudinaryCount++
        cloudinaryUrls.push({
          id: product.id,
          name: product.name,
          url: product.image,
        })
      } else if (product.image.includes('supabase.co')) {
        supabaseCount++
      } else {
        otherCount++
      }
    }

    // Check additional images
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((imgUrl: string) => {
        if (imgUrl.includes('cloudinary.com')) {
          cloudinaryCount++
        } else if (imgUrl.includes('supabase.co')) {
          supabaseCount++
        } else {
          otherCount++
        }
      })
    }
  })

  console.log('📊 SONUÇLAR:')
  console.log(`   Toplam ürün: ${products.length}`)
  console.log(`   Cloudinary URL\'leri: ${cloudinaryCount} ⚠️`)
  console.log(`   Supabase Storage URL\'leri: ${supabaseCount} ✅`)
  console.log(`   Diğer kaynaklar: ${otherCount}`)
  console.log('')

  if (cloudinaryCount > 0) {
    console.log('⚠️  Cloudinary URL\'leri bulundu!')
    console.log(`   ${cloudinaryUrls.length} ürünün ana görseli Cloudinary\'den`)
    console.log('')
    console.log('📝 Örnek Cloudinary URL\'leri:')
    cloudinaryUrls.slice(0, 5).forEach((item) => {
      console.log(`   - ${item.name}: ${item.url.substring(0, 80)}...`)
    })
    console.log('')
    console.log('💡 Bu URL\'leri Supabase Storage\'a migrate etmek için:')
    console.log('   npm run migrate-images')
  } else {
    console.log('✅ Tüm görseller Supabase Storage\'dan çekiliyor!')
  }
}

checkImageSources()
  .then(() => {
    console.log('\n✅ Kontrol tamamlandı.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Hata:', error)
    process.exit(1)
  })

