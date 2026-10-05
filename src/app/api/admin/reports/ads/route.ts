import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import { summarizeRoas, validDay, type RevenueOrder, type AdSpend } from '@/lib/analytics/roas'

export const dynamic = 'force-dynamic'
async function authorized() {
  const client = await createSupabaseServer()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
  const { data } = await client.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return NextResponse.json({ error: 'Yönetici yetkisi gerekiyor' }, { status: 403 })
  return null
}
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request: NextRequest) {
  try {
    const denied = await authorized()
    if (denied) return denied
    const from = request.nextUrl.searchParams.get('from'), to = request.nextUrl.searchParams.get('to')
    if (!validDay(from) || !validDay(to) || from > to || Date.parse(to) - Date.parse(from) > 366 * 86400000) return json({ error: 'En fazla 366 günlük geçerli tarih aralığı seçin' }, 400)
    const client = createSupabaseAdmin()
    const orders: RevenueOrder[] = []
    const costs: AdSpend[] = []
    // Reporting days use the store's timezone, independent of the Vercel region.
    const start = `${from}T00:00:00+03:00`
    const end = new Date(Date.parse(`${to}T00:00:00+03:00`) + 86400000).toISOString()
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from('orders').select('payment_status,status,total,items,shipping_cost,discount_amount,tracking,utm_source,utm_campaign')
        .gte('created_at', start).lt('created_at', end).eq('payment_status', 'completed').order('id').range(offset, offset + 999)
      if (error) throw error
      orders.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from('ad_spend').select('source,campaign,amount,platform_revenue')
        .gte('day', from).lte('day', to).order('id').range(offset, offset + 999)
      if (error) throw error
      costs.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    return json({ rows: summarizeRoas(orders, costs), from, to })
  } catch {
    return json({ error: 'Rapor alınamadı. Ölçüm ve reklam harcaması migration dosyalarını kontrol edin.' }, 503)
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await authorized()
    if (denied) return denied
    const origin = request.headers.get('origin')
    if (!origin || origin !== request.nextUrl.origin) return json({ error: 'Geçersiz istek kaynağı' }, 403)
    if (Number(request.headers.get('content-length')) > 4096) return json({ error: 'İstek çok büyük' }, 413)
    const body = await request.json()
    const source = typeof body.source === 'string' ? body.source.trim().toLowerCase() : ''
    const campaign = typeof body.campaign === 'string' ? body.campaign.trim() : ''
    if (!validDay(body.day) || !/^[a-z0-9_.-]{1,100}$/.test(source) || campaign.length > 200 || typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount < 0 || body.amount > 1e9 || (body.platformRevenue != null && (typeof body.platformRevenue !== 'number' || !Number.isFinite(body.platformRevenue) || body.platformRevenue < 0 || body.platformRevenue > 1e12))) return json({ error: 'Tarih, kaynak ve TL tutarlarını kontrol edin' }, 400)
    const { error } = await createSupabaseAdmin().from('ad_spend').upsert({ day: body.day, source, campaign, amount: body.amount, platform_revenue: body.platformRevenue ?? null }, { onConflict: 'day,source,campaign' })
    if (error) throw error
    return json({ success: true })
  } catch {
    return json({ error: 'Harcama kaydedilemedi. ad_spend migration dosyasını kontrol edin.' }, 503)
  }
}
