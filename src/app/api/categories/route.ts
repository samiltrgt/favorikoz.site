import { NextResponse } from 'next/server'
import { getPublicCategories } from '@/lib/categories-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/categories - Get all categories with subcategories
export async function GET() {
  try {
    const { tree, flat } = await getPublicCategories()
    const mainCategories = tree.map(({ slug, name, description, parent_slug, deleted_at }) => ({
      slug,
      name,
      description,
      parent_slug,
      deleted_at,
    }))
    const subcategories = flat.filter((cat) => !!cat.parent_slug)

    return NextResponse.json(
      {
        success: true,
        data: tree,
        flat,
        mainCategories,
        subcategories,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
