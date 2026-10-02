import { NextResponse } from 'next/server'
import { createSupabaseAnon } from '@/lib/supabase/server'
import { dbToDisplay } from '@/lib/price'
import { getSiteUrl } from '@/lib/site-url'

export const revalidate = 3600

/**
 * Meta katalog + Google Merchant Center uyumlu ürün feed (TSV).
 * id = products.id — Pixel content_ids ile birebir aynı.
 * GET /api/feeds/products
 */
export async function GET() {
  try {
    const supabase = createSupabaseAnon()
    const siteUrl = getSiteUrl().replace(/\/+$/, '')
    const pageSize = 1000
    let from = 0
    const rows: Record<string, unknown>[] = []

    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, slug, name, brand, description, price, image, images, in_stock, stock_quantity'
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1)

      if (error) throw error
      const batch = data || []
      rows.push(...batch)
      if (batch.length < pageSize) break
      from += pageSize
    }

    const header = [
      'id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'brand',
    ].join('\t')

    const lines = rows.map((row) => {
      const id = String(row.id)
      const title = escapeTsv(String(row.name || ''))
      const description = escapeTsv(
        String(row.description || row.name || '')
          .replace(/\s+/g, ' ')
          .slice(0, 5000)
      )
      const inStock = row.in_stock !== false && Number(row.stock_quantity) > 0
      const availability = inStock ? 'in_stock' : 'out_of_stock'
      const priceTl = dbToDisplay(Number(row.price) || 0)
      const price = `${priceTl.toFixed(2)} TRY`
      const link = `${siteUrl}/urun/${encodeURIComponent(String(row.slug))}`
      const images = Array.isArray(row.images) ? row.images : []
      const imageLink = String(row.image || images[0] || '')
      const brand = escapeTsv(String(row.brand || 'Favori Kozmetik'))

      return [
        id,
        title,
        description,
        availability,
        'new',
        price,
        link,
        imageLink,
        brand,
      ].join('\t')
    })

    const body = [header, ...lines].join('\n')

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('[feeds/products]', err)
    return NextResponse.json({ success: false, error: 'Feed oluşturulamadı' }, { status: 500 })
  }
}

function escapeTsv(value: string): string {
  return value.replace(/[\t\n\r]/g, ' ').trim()
}
