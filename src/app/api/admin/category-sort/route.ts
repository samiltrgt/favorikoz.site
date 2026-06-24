import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import {
  ensureOrderIncludesSiblings,
  loadCategorySortConfig,
  moveSlugInOrder,
  MENU_SORT_SLUG,
  saveCategorySortConfig,
} from '@/lib/category-sort-config'

async function checkAdminAccess(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authorized: false, error: 'Unauthorized', status: 401 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { authorized: false, error: 'Forbidden: Admin access required', status: 403 }
  }

  return { authorized: true }
}

// GET /api/admin/category-sort
export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    const accessCheck = await checkAdminAccess(supabase)
    if (!accessCheck.authorized) {
      return NextResponse.json({ success: false, error: accessCheck.error }, { status: accessCheck.status })
    }

    const config = await loadCategorySortConfig(supabase)
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Category sort GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load sort config' }, { status: 500 })
  }
}

// POST /api/admin/category-sort  { parent_slug: "tirnak" | null, slug: "...", direction: "up" | "down" }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const accessCheck = await checkAdminAccess(supabase)
    if (!accessCheck.authorized) {
      return NextResponse.json({ success: false, error: accessCheck.error }, { status: accessCheck.status })
    }

    const body = await request.json()
    const parentSlug = body.parent_slug ?? null
    const slug = body.slug as string
    const direction = body.direction as 'up' | 'down'

    if (!slug || (direction !== 'up' && direction !== 'down')) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }

    let siblingsQuery = supabase
      .from('categories')
      .select('slug')
      .is('deleted_at', null)
      .neq('slug', MENU_SORT_SLUG)

    siblingsQuery =
      parentSlug === null
        ? siblingsQuery.is('parent_slug', null)
        : siblingsQuery.eq('parent_slug', parentSlug)

    const { data: siblings, error: siblingsError } = await siblingsQuery

    if (siblingsError) throw siblingsError

    const siblingSlugs = (siblings || []).map((s: { slug: string }) => s.slug)
    if (!siblingSlugs.includes(slug)) {
      return NextResponse.json({ success: false, error: 'Category not found in parent' }, { status: 404 })
    }

    const config = await loadCategorySortConfig(supabase)
    const key = parentSlug ?? 'root'
    const currentOrder = ensureOrderIncludesSiblings(config[key], siblingSlugs)
    const nextOrder = moveSlugInOrder(currentOrder, slug, direction)

    if (!nextOrder) {
      return NextResponse.json({ success: false, error: 'Cannot move further' }, { status: 400 })
    }

    config[key] = nextOrder
    await saveCategorySortConfig(supabase, config)

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Category sort POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update sort order' }, { status: 500 })
  }
}
