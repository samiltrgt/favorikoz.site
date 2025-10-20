/* eslint-disable */
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

function slugify(str) {
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

function toNumber(v) {
  if (typeof v === 'number') return v
  if (!v) return 0
  const s = String(v).replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(/,/g, '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function pick(row, keys) {
  const lower = {}
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

function normalizeCategory(cat) {
  if (!cat) return 'kisisel-bakim'
  const s = slugify(String(cat))
  const map = {
    'protez-tirnak': 'protez-tirnak',
    'kalici-makyaj': 'kalici-makyaj',
    'ipek-kirpik': 'ipek-kirpik',
    'kisisel-bakim': 'kisisel-bakim',
    'makyaj': 'makyaj',
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

function ensureHttps(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (s.startsWith('http')) return s
  return s
}

function importExcel(xlsxPath) {
  const wb = XLSX.readFile(xlsxPath)
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  const out = []
  const now = new Date().toISOString().slice(0, 10)

  rows.forEach((row, idx) => {
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
    
    // Collect additional images (Görsel 2-8, since Görsel 1 is the main image)
    const additionalImages = []
    for (let i = 2; i <= 8; i++) { // Check Görsel 2-8
      const imageValue = pick(row, [`Görsel ${i}`])
      if (imageValue) {
        const cleanUrl = ensureHttps(imageValue)
        if (cleanUrl) {
          additionalImages.push(cleanUrl)
        }
      }
    }

    const id = `imp-${Date.now()}-${idx}`
    const slug = slugify(name)

    out.push({
      id,
      slug,
      name,
      brand,
      price: price || 0,
      originalPrice: originalPrice || undefined,
      image,
      images: additionalImages, // Additional images array
      rating: 4.6,
      reviews: Math.floor(Math.random() * 150) + 5,
      isNew,
      isBestSeller,
      discount: originalPrice && price ? Math.max(0, Math.round((1 - price / originalPrice) * 100)) : undefined,
      inStock,
      category,
      createdAt: now,
      description,
      barcode: barcode || `FK${String(idx + 1).padStart(6, '0')}`, // Eğer barkod yoksa otomatik kod oluştur
    })
  })

  const target = path.join(process.cwd(), 'src', 'lib', 'imported-products.ts')
  const ts = `export const importedProducts = ${JSON.stringify(out, null, 2)}\n`
  fs.writeFileSync(target, ts, 'utf8')
  console.log(`Wrote ${out.length} products to`, target)
}

const xlsxArg = process.argv[2]
if (!xlsxArg) {
  console.error('Usage: node scripts/import-excel.js "C:\\path\\file.xlsx"')
  process.exit(1)
}
importExcel(xlsxArg)


