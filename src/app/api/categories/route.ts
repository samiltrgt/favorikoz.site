import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

type CategoryRow = {
  slug: string
  name: string
  description?: string | null
  parent_slug?: string | null
  deleted_at?: string | null
}

function buildCategoryTree(rows: CategoryRow[]) {
  const byParent = new Map<string | null, CategoryRow[]>()
  for (const row of rows) {
    const key = row.parent_slug ?? null
    const list = byParent.get(key) ?? []
    list.push(row)
    byParent.set(key, list)
  }
  const makeNode = (row: CategoryRow): CategoryRow & { subcategories: any[] } => ({
    ...row,
    subcategories: (byParent.get(row.slug) ?? []).map(makeNode),
  })
  return (byParent.get(null) ?? []).map(makeNode)
}

// GET /api/categories - Get all categories with subcategories
export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    
    // Get all categories (including subcategories)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }
    
    const flat = (data || []) as CategoryRow[]
    const categoriesWithSubcategories = buildCategoryTree(flat)
    const mainCategories = flat.filter((cat) => !cat.parent_slug)
    const subcategories = flat.filter((cat) => !!cat.parent_slug)
    
    // Return both flat list and hierarchical structure
    return NextResponse.json({ 
      success: true, 
      data: categoriesWithSubcategories,
      flat, // Flat list for backward compatibility
      mainCategories,
      subcategories
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

