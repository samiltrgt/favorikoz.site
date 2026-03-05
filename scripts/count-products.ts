#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function run() {
  const { count: total } = await supabase
    .from('products').select('*', { count: 'exact', head: true }).is('deleted_at', null)
  const { count: inStock } = await supabase
    .from('products').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('in_stock', true).gt('stock_quantity', 0)
  console.log('Toplam ürün (DB):', total)
  console.log('Stokta olan:', inStock)
  console.log('API limiti (şu an):', 1000)
  if ((inStock ?? 0) > 1000) console.log('⚠️  SORUN: Stokta olan ürün > 1000, limit artırılmalı!')
  else console.log('✅ Limit yeterli')
}
run()
