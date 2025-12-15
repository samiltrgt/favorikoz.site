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

// GET /api/admin/categories/[slug] - Get single category (Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
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
    
    const { slug } = params
    
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single()
    
    if (error || !category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: category
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/categories/[slug] - Update category (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
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
    
    const { slug } = params
    const body = await request.json()
    const { name, new_slug, description, parent_slug } = body
    
    // Check if category exists
    const { data: existing, error: fetchError } = await supabase
      .from('categories')
      .select('slug')
      .eq('slug', slug)
      .single()
    
    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }
    
    // If new_slug is provided and different, check if it's available
    if (new_slug && new_slug !== slug) {
      const { data: slugExists } = await supabase
        .from('categories')
        .select('slug')
        .eq('slug', new_slug)
        .single()
      
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Category with this slug already exists' },
          { status: 400 }
        )
      }
    }
    
    // If parent_slug is provided, verify it exists and is not the same category
    if (parent_slug !== undefined) {
      if (parent_slug === slug) {
        return NextResponse.json(
          { success: false, error: 'Category cannot be its own parent' },
          { status: 400 }
        )
      }
      
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
    }
    
    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (name !== undefined) updateData.name = name
    if (new_slug !== undefined) updateData.slug = new_slug
    if (description !== undefined) updateData.description = description
    if (parent_slug !== undefined) updateData.parent_slug = parent_slug || null
    
    // Update category
    const { data: updatedCategory, error: updateError } = await supabase
      .from('categories')
      .update(updateData)
      .eq('slug', slug)
      .select()
      .single()
    
    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update category' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updatedCategory
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/categories/[slug] - Soft delete category (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
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
    
    const { slug } = params
    
    // Check if category exists
    const { data: existing, error: fetchError } = await supabase
      .from('categories')
      .select('slug, parent_slug')
      .eq('slug', slug)
      .single()
    
    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }
    
    // Check if this is a main category with subcategories
    const { data: subcategories } = await supabase
      .from('categories')
      .select('slug')
      .eq('parent_slug', slug)
      .is('deleted_at', null)
    
    if (subcategories && subcategories.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete category with subcategories. Please delete subcategories first.' },
        { status: 400 }
      )
    }
    
    // Check if any products use this category
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .or(`category_slug.eq.${slug},subcategory_slug.eq.${slug}`)
      .is('deleted_at', null)
      .limit(1)
    
    if (products && products.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete category that is used by products' },
        { status: 400 }
      )
    }
    
    // Soft delete
    const { error: deleteError } = await supabase
      .from('categories')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('slug', slug)
    
    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete category' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}

