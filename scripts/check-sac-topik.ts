#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function check() {
  const { data: all, error } = await supabase
    .from('products')
    .select('id,name,in_stock,stock_quantity,category_slug,subcategory_slug,deleted_at')
    .eq('subcategory_slug', 'sac-topik')

  if (error) { console.error('Hata:', error.message); return }

  console.log('\n=== SAC-TOPIK ÜRÜN RAPORU ===')
  console.log('Toplam sac-topik ürün (DB):', all?.length)

  const active    = all?.filter(p => p.deleted_at == null)
  const inStock   = active?.filter(p => p.in_stock && p.stock_quantity > 0)
  const outStock  = active?.filter(p => !p.in_stock || p.stock_quantity <= 0)
  const deleted   = all?.filter(p => p.deleted_at != null)
  const cats      = [...new Set(all?.map(p => p.category_slug))]

  console.log('  Silinmemiş (deleted_at=null):', active?.length)
  console.log('  Stokta (in_stock=true, qty>0):', inStock?.length)
  console.log('  Stokta değil (filtreleniyor):', outStock?.length)
  console.log('  Silinmiş (deleted_at!=null):', deleted?.length)
  console.log('  category_slug değerleri:', cats)

  if (outStock && outStock.length > 0) {
    console.log('\nStokta olmayan ürünler (ilk 5):')
    outStock.slice(0, 5).forEach(p =>
      console.log(`  - "${p.name.slice(0, 50)}" | in_stock=${p.in_stock} | stock_qty=${p.stock_quantity}`)
    )
  }
}

check()
