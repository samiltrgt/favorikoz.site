import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// GET /api/categories - Get all categories
export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    
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
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

