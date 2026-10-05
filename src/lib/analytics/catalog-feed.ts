import { NextResponse } from 'next/server'
import { createSupabaseAnon } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'
import { catalogTsv, catalogXml, type CatalogRow } from './catalog'

export async function productFeed(format: 'xml' | 'tsv') {
  try {
    const supabase = createSupabaseAnon()
    const rows: CatalogRow[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('products')
        .select('id,slug,name,brand,description,price,image,images,in_stock,stock_quantity,barcode')
        .is('deleted_at', null).order('id', { ascending: true }).range(from, from + 999)
      if (error) throw error
      rows.push(...(data || []))
      if ((data || []).length < 1000) break
    }
    const origin = getSiteUrl().replace(/\/+$/, '')
    return new NextResponse(format === 'xml' ? catalogXml(rows, origin) : catalogTsv(rows, origin), {
      headers: {
        'Content-Type': format === 'xml' ? 'application/xml; charset=utf-8' : 'text/tab-separated-values; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    console.error('[catalog-feed] Catalog query failed')
    return NextResponse.json({ success: false, error: 'Feed oluşturulamadı' }, { status: 503 })
  }
}
