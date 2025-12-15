import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// Helper function to check admin access
async function checkAdminAccess(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 }
  }
  
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

// GET /api/admin/categories - Get all categories (Admin only)
export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    
    // Check admin access
    const accessCheck = await checkAdminAccess(supabase)
    if (!accessCheck.authorized) {
      return NextResponse.json(
        { success: false, error: accessCheck.error },
        { status: accessCheck.status }
      )
    }
    
    // Get all categories (including deleted for admin view)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('parent_slug', { ascending: true, nullsFirst: true })
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
    
    return NextResponse.json({ 
      success: true, 
      data: categoriesWithSubcategories,
      flat: data,
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

// POST /api/admin/categories - Create new category (Admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check admin access
    const accessCheck = await checkAdminAccess(supabase)
    if (!accessCheck.authorized) {
      return NextResponse.json(
        { success: false, error: accessCheck.error },
        { status: accessCheck.status }
      )
    }
    
    const body = await request.json()
    const { name, slug, description, parent_slug } = body
    
    // Validation
    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Name and slug are required' },
        { status: 400 }
      )
    }
    
    // If parent_slug is provided, verify it exists
    if (parent_slug) {
      const { data: parent, error: parentError } = await supabase
        .from('categories')
        .select('slug')
        .eq('slug', parent_slug)
        .is('deleted_at', null)
        .single()
      
      if (parentError || !parent) {
        return NextResponse.json(
          { success: false, error: 'Parent category not found' },
          { status: 400 }
        )
      }
    }
    
    // Check if slug already exists
    const { data: existing } = await supabase
      .from('categories')
      .select('slug')
      .eq('slug', slug)
      .single()
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Category with this slug already exists' },
        { status: 400 }
      )
    }
    
    // Insert category
    const { data: newCategory, error: insertError } = await supabase
      .from('categories')
      .insert({
        name,
        slug,
        description: description || null,
        parent_slug: parent_slug || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create category' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: newCategory
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    )
  }
}

