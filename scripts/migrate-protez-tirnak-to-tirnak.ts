/**
 * Migration Script: Protez Tırnak -> Tırnak
 * 
 * Bu script "protez-tirnak" kategorisindeki tüm ürünleri "tirnak" kategorisine taşır.
 * 
 * Kullanım:
 *   npx tsx scripts/migrate-protez-tirnak-to-tirnak.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE ENVIRONMENT VARIABLES EKSİK!')
  console.error('Lütfen .env.local dosyasında şu değişkenleri tanımlayın:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrate() {
  console.log('🔄 Migration başlatılıyor...\n')

  try {
    // 1. "tirnak" kategorisinin var olduğundan emin ol
    console.log('1️⃣ "tirnak" kategorisini kontrol ediliyor...')
    const { data: tirnakCategory, error: checkError } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', 'tirnak')
      .single()

    if (checkError && checkError.code === 'PGRST116') {
      // Kategori yok, oluştur
      console.log('   "tirnak" kategorisi bulunamadı, oluşturuluyor...')
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          slug: 'tirnak',
          name: 'Tırnak',
          description: 'Tırnak bakımı ve protez tırnak ürünleri',
        })

      if (insertError) {
        console.error('   ❌ Kategori oluşturulamadı:', insertError.message)
        throw insertError
      }
      console.log('   ✅ "tirnak" kategorisi oluşturuldu')
    } else if (checkError) {
      console.error('   ❌ Kategori kontrolü başarısız:', checkError.message)
      throw checkError
    } else {
      console.log('   ✅ "tirnak" kategorisi mevcut')
    }

    // 2. "protez-tirnak" kategorisindeki ürünleri say
    console.log('\n2️⃣ "protez-tirnak" kategorisindeki ürünler sayılıyor...')
    const { count: beforeCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_slug', 'protez-tirnak')
      .is('deleted_at', null)

    if (countError) {
      console.error('   ❌ Ürün sayımı başarısız:', countError.message)
      throw countError
    }

    console.log(`   📊 ${beforeCount || 0} ürün bulundu`)

    if (!beforeCount || beforeCount === 0) {
      console.log('\n✅ Taşınacak ürün bulunamadı. Migration tamamlandı.')
      return
    }

    // 3. Ürünleri güncelle
    console.log('\n3️⃣ Ürünler "tirnak" kategorisine taşınıyor...')
    const { data: updatedProducts, error: updateError } = await supabase
      .from('products')
      .update({ category_slug: 'tirnak' })
      .eq('category_slug', 'protez-tirnak')
      .is('deleted_at', null)
      .select('id')

    if (updateError) {
      console.error('   ❌ Ürün güncelleme başarısız:', updateError.message)
      throw updateError
    }

    console.log(`   ✅ ${updatedProducts?.length || 0} ürün başarıyla taşındı`)

    // 4. Kontrol: "protez-tirnak" kategorisinde kalan ürün var mı?
    console.log('\n4️⃣ Kontrol yapılıyor...')
    const { count: remainingCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_slug', 'protez-tirnak')
      .is('deleted_at', null)

    if (remainingCount && remainingCount > 0) {
      console.warn(`   ⚠️  Uyarı: ${remainingCount} ürün hala "protez-tirnak" kategorisinde`)
    } else {
      console.log('   ✅ Tüm ürünler başarıyla taşındı')
    }

    // 5. "tirnak" kategorisindeki toplam ürün sayısı
    const { count: tirnakCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_slug', 'tirnak')
      .is('deleted_at', null)

    console.log(`\n📊 "tirnak" kategorisindeki toplam ürün sayısı: ${tirnakCount || 0}`)

    console.log('\n✅ Migration başarıyla tamamlandı!')
    console.log('\n📝 Not: Kod referanslarını güncellemeyi unutmayın:')
    console.log('   - Admin panel kategorileri')
    console.log('   - Hero section linkleri')
    console.log('   - Footer linkleri')
    console.log('   - Diğer hardcoded referanslar')

  } catch (error: any) {
    console.error('\n❌ Migration başarısız:', error.message)
    process.exit(1)
  }
}

migrate()

