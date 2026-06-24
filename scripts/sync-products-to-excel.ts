#!/usr/bin/env tsx
import * as dotenv from 'dotenv'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

function pick(row: any, keys: string[]) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k]
  }
  return undefined
}

function readExcelBarcodes(path: string) {
  const wb = XLSX.readFile(path)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  const set = new Set<string>()

  rows.forEach((row: any, idx: number) => {
    const raw =
      pick(row, ['Barkod', 'barkod', 'barcode', 'kod', 'code', 'sku', 'ürün kodu', 'urun kodu']) ||
      `FK${String(idx + 1).padStart(6, '0')}`
    const barcode = String(raw).trim()
    if (barcode) set.add(barcode)
  })
  return set
}

async function main() {
  const excelBarcodes = readExcelBarcodes('katliurun.xlsx')
  const now = new Date().toISOString()

  let from = 0
  const pageSize = 1000
  const allActive: Array<{ id: string; barcode: string | null }> = []

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id,barcode')
      .is('deleted_at', null)
      .range(from, from + pageSize - 1)

    if (error) throw error
    const batch = data || []
    allActive.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  const toDeleteIds = allActive
    .filter((p) => !p.barcode || !excelBarcodes.has(String(p.barcode).trim()))
    .map((p) => p.id)

  let deleted = 0
  for (let i = 0; i < toDeleteIds.length; i += 200) {
    const ids = toDeleteIds.slice(i, i + 200)
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: now, in_stock: false, stock_quantity: 0, updated_at: now })
      .in('id', ids)
    if (error) throw error
    deleted += ids.length
  }

  // Excel'de olan ama soft-delete kalmış ürünleri geri aç
  from = 0
  const softDeleted: Array<{ id: string; barcode: string | null }> = []
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id,barcode')
      .not('deleted_at', 'is', null)
      .range(from, from + pageSize - 1)

    if (error) throw error
    const batch = data || []
    softDeleted.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  const activeBarcodes = new Set(
    allActive
      .map((p) => (p.barcode ? String(p.barcode).trim() : ''))
      .filter(Boolean)
  )

  const toRestoreIds = softDeleted
    .filter((p) => {
      const barcode = p.barcode ? String(p.barcode).trim() : ''
      return barcode && excelBarcodes.has(barcode) && !activeBarcodes.has(barcode)
    })
    .map((p) => p.id)

  let restored = 0
  for (let i = 0; i < toRestoreIds.length; i += 200) {
    const ids = toRestoreIds.slice(i, i + 200)
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: null, updated_at: now })
      .in('id', ids)
    if (error) throw error
    restored += ids.length
  }

  console.log(`Excel barkod sayısı: ${excelBarcodes.size}`)
  console.log(`Aktif ürün (senkron öncesi): ${allActive.length}`)
  console.log(`Excel'de olmayıp kaldırılan: ${deleted}`)
  console.log(`Excel'de olup geri açılan: ${restored}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

