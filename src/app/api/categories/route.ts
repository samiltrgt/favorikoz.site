import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

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
    
    // Separate main categories and subcategories
    const mainCategories = data?.filter(cat => !cat.parent_slug) || []
    const subcategories = data?.filter(cat => cat.parent_slug) || []
    
    // Group subcategories under their parent categories
    const categoriesWithSubcategories = mainCategories.map(category => ({
      ...category,
      subcategories: subcategories.filter(sub => sub.parent_slug === category.slug)
    }))
    
    // Return both flat list and hierarchical structure
    return NextResponse.json({ 
      success: true, 
      data: categoriesWithSubcategories,
      flat: data, // Flat list for backward compatibility
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

