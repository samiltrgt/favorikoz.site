export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { revalidateProductCatalog } from '@/lib/product-cache'
import {
  loadHomeLayoutConfig,
  mergeHomeLayout,
  saveHomeLayoutConfig,
  type HomeLayoutConfig,
} from '@/lib/home-layout'

async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authorized: false, status: 401 as const, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return { authorized: false, status: 403 as const, error: 'Forbidden' }
  }
  return { authorized: true }
}

async function withProducts(config: HomeLayoutConfig) {
  const ids = [
    ...config.featured.productIds,
    ...config.rows.flatMap((row) => row.productIds),
  ]
  const uniqueIds = Array.from(new Set(ids))
  const byId = new Map<string, { id: string; name: string; brand: string | null; image: string | null }>()

  if (uniqueIds.length > 0) {
    const supabase = await createSupabaseServer()
    const { data } = await supabase
      .from('products')
      .select('id, name, brand, image')
      .in('id', uniqueIds)
      .is('deleted_at', null)

    for (const product of data || []) {
      byId.set(product.id, product)
    }
  }

  const resolve = (productIds: string[]) =>
    productIds
      .map((id) => byId.get(id))
      .filter((product): product is NonNullable<typeof product> => Boolean(product))

  return {
    featured: {
      title: config.featured.title,
      description: config.featured.description,
      ctaLabel: config.featured.ctaLabel,
      href: config.featured.href,
      productIds: config.featured.productIds,
      products: resolve(config.featured.productIds),
    },
    rows: config.rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      productIds: row.productIds,
      products: resolve(row.productIds),
    })),
    fontenay: config.fontenay,
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    const auth = await checkAdminAccess(supabase)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const config = await loadHomeLayoutConfig()
    return NextResponse.json({ success: true, data: await withProducts(config) })
  } catch (error) {
    console.error('home-layout GET error:', error)
    return NextResponse.json({ success: false, error: 'Ayarlar okunamadı' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const auth = await checkAdminAccess(supabase)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const current = await loadHomeLayoutConfig()
    const next = mergeHomeLayout(current, {
      featured: body.featured,
      rows: body.rows,
      fontenay: body.fontenay,
    })
    await saveHomeLayoutConfig(next)
    revalidateProductCatalog()

    return NextResponse.json({ success: true, data: await withProducts(next) })
  } catch (error) {
    console.error('home-layout PUT error:', error)
    return NextResponse.json({ success: false, error: 'Ayarlar kaydedilemedi' }, { status: 500 })
  }
}
