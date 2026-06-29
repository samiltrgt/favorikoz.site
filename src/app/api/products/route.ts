import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServer } from '@/lib/supabase/server'

type CategoryLookupRow = {
  slug: string
  parent_slug: string | null
}

async function resolveRootCategorySlug(supabase: any, categorySlug: string) {
  let currentSlug: string | null = categorySlug
  while (currentSlug) {
    const categoryQueryResult: { data: CategoryLookupRow | null } = await supabase
      .from('categories')
      .select('slug,parent_slug')
      .eq('slug', currentSlug)
      .single()
    const categoryData = categoryQueryResult.data

    if (!categoryData) {
      return null
    }

    if (!categoryData.parent_slug) {
      return categoryData.slug
    }

    currentSlug = categoryData.parent_slug
  }

  return null
}

async function isAdminRequest(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'admin') return true
  }

  const cookieStore = await cookies()
  return Boolean(cookieStore.get('adminAuthV2')?.value)
}

function mapProductPrices(products: any[]) {
  return products.map((p) => ({
    ...p,
    price: (p.price / 100) / 10,
    original_price: p.original_price ? (p.original_price / 100) / 10 : null,
  }))
}

async function fetchAllProducts(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  applyFilters: (query: any) => any
) {
  const pageSize = 1000
  let from = 0
  const all: any[] = []

  while (true) {
    let query = supabase.from('products').select('*').is('deleted_at', null)
    query = applyFilters(query)
    query = query.order('created_at', { ascending: false }).range(from, from + pageSize - 1)

    const { data, error } = await query
    if (error) throw error

    const batch = data || []
    all.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return all
}

// GET /api/products - Get all products
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1000
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')
    const search = searchParams.get('search')
    const view = searchParams.get('view') // view=counts -> lightweight response for header counts
    const idsParam = searchParams.get('ids') // comma-separated IDs (e.g. for favorites page)
    const scopeAdmin = searchParams.get('scope') === 'admin' // Admin paneli: tüm ürünler (stok filtresi yok)
    
    const ids = idsParam
      ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    
    const fetchByIds = ids.length > 0
    
    let skipStockFilter = fetchByIds
    if (scopeAdmin && (await isAdminRequest(supabase))) {
      skipStockFilter = true
    }
    
    if (view === 'counts') {
      // Fetch ALL matching products (Supabase caps each request at 1000 rows, so paginate).
      const pageSize = 1000
      let fromIdx = 0
      const rows: Array<{ category_slug: string | null; subcategory_slug: string | null }> = []

      while (true) {
        let countsQuery = supabase
          .from('products')
          .select('category_slug, subcategory_slug')
          .is('deleted_at', null)

        if (!skipStockFilter) {
          countsQuery = countsQuery.eq('in_stock', true).gt('stock_quantity', 0)
        }
        countsQuery = countsQuery.range(fromIdx, fromIdx + pageSize - 1)

        const { data, error } = await countsQuery
        if (error) {
          console.error('❌ Supabase error:', {
            message: error.message,
            details: error,
            code: error.code,
            hint: error.hint,
          })
          return NextResponse.json(
            {
              success: false,
              error: error.message || 'Failed to fetch products',
            },
            { status: 500 }
          )
        }

        const batch = data || []
        rows.push(...batch)
        if (batch.length < pageSize) break
        fromIdx += pageSize
      }

      // Load category tree so nested subcategories roll up their descendants' products.
      const { data: cats, error: catError } = await supabase
        .from('categories')
        .select('slug, parent_slug')
        .is('deleted_at', null)
      if (catError) {
        return NextResponse.json(
          { success: false, error: catError.message || 'Failed to load categories' },
          { status: 500 }
        )
      }

      const childrenOf = new Map<string, string[]>()
      for (const c of cats || []) {
        if (!c.parent_slug) continue
        if (!childrenOf.has(c.parent_slug)) childrenOf.set(c.parent_slug, [])
        childrenOf.get(c.parent_slug)!.push(c.slug)
      }

      // Products are assigned to a single (usually leaf) subcategory_slug.
      const directSub = new Map<string, number>()
      for (const r of rows) {
        if (r.subcategory_slug) {
          directSub.set(r.subcategory_slug, (directSub.get(r.subcategory_slug) || 0) + 1)
        }
      }

      // Aggregated count = products directly in the slug + all of its descendants.
      const computed = new Map<string, number>()
      const aggregate = (slug: string, stack: Set<string>): number => {
        if (computed.has(slug)) return computed.get(slug)!
        if (stack.has(slug)) return 0
        stack.add(slug)
        let total = directSub.get(slug) || 0
        for (const child of childrenOf.get(slug) || []) total += aggregate(child, stack)
        stack.delete(slug)
        computed.set(slug, total)
        return total
      }

      const counts: Record<string, number> = {}
      for (const c of cats || []) counts[c.slug] = aggregate(c.slug, new Set())

      return NextResponse.json({ success: true, counts, total: rows.length })
    }

    if (fetchByIds) {
      let idsQuery = supabase.from('products').select('*').is('deleted_at', null).in('id', ids)
      if (!skipStockFilter) {
        idsQuery = idsQuery.eq('in_stock', true).gt('stock_quantity', 0)
      }
      const { data, error } = await idsQuery
      if (error) {
        console.error('❌ Supabase error:', {
          message: error.message,
          details: error,
          code: error.code,
          hint: error.hint,
        })
        return NextResponse.json(
          {
            success: false,
            error: error.message || 'Failed to fetch products',
            details: process.env.NODE_ENV === 'development' ? {
              code: error.code,
              hint: error.hint,
              details: error.details,
            } : undefined,
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true, data: mapProductPrices(data || []) })
    }

    const applyListFilters = (baseQuery: any) => {
      let filtered = baseQuery
      if (subcategory) {
        filtered = filtered.eq('subcategory_slug', subcategory)
      } else if (category) {
        filtered = filtered.eq('category_slug', category)
      }
      if (search) {
        filtered = filtered.or(`name.ilike.%${search}%,brand.ilike.%${search}%,description.ilike.%${search}%`)
      }
      if (!skipStockFilter) {
        filtered = filtered.eq('in_stock', true).gt('stock_quantity', 0)
      }
      return filtered
    }

    if (skipStockFilter && scopeAdmin) {
      const data = await fetchAllProducts(supabase, applyListFilters)
      return NextResponse.json({ success: true, data: mapProductPrices(data) })
    }

    let query = applyListFilters(supabase.from('products').select('*').is('deleted_at', null))
    query = query.order('created_at', { ascending: false }).limit(limit || 1000)

    const { data, error } = await query
    
    if (error) {
      console.error('❌ Supabase error:', {
        message: error.message,
        details: error,
        code: error.code,
        hint: error.hint
      })
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Failed to fetch products',
          details: process.env.NODE_ENV === 'development' ? {
            code: error.code,
            hint: error.hint,
            details: error.details
          } : undefined
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, data: mapProductPrices(data || []) })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Add new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Convert camelCase to snake_case and price from TL to kuruş
    // Generate slug from name if not provided
    const generatedSlug = body.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || crypto.randomUUID()
    
    // Category handling: category_slug should be the main category, subcategory_slug should be the subcategory
    let categorySlug = body.category || null
    let subcategorySlug = body.subcategory || null
    
    // If subcategory is provided, map category to the top-level ancestor
    if (subcategorySlug) {
      const rootCategorySlug = await resolveRootCategorySlug(supabase, subcategorySlug)
      if (rootCategorySlug) {
        categorySlug = rootCategorySlug
      }
    }
    
    const productData: any = {
      id: body.id || crypto.randomUUID(),
      slug: body.slug || generatedSlug,
      name: body.name,
      brand: body.brand || null,
      category_slug: categorySlug,
      subcategory_slug: subcategorySlug,
      description: body.description || null,
      barcode: body.barcode || null,
      image: body.image || null,
      images: body.images || [],
      rating: body.rating || 0,
      reviews_count: body.reviews || 0,
      discount: body.discount || null,
      // Boolean flags (camelCase → snake_case)
      is_new: body.isNew || false,
      is_best_seller: body.isBestSeller || false,
      in_stock: body.inStock !== undefined ? body.inStock : true,
      stock_quantity: body.stock_quantity || 300,
      // Price conversion (TL/10 → kuruş)
      // Admin panelden gelen fiyat zaten /10 formatında, bu yüzden *1000 yapıyoruz (TL/10 * 10 * 100 = kuruş)
      price: Math.round(body.price * 1000),
      original_price: body.original_price ? Math.round(body.original_price * 1000) : (body.originalPrice ? Math.round(body.originalPrice * 1000) : null),
    }
    
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }
    
    // Convert back to TL, then divide by 10 for display
    const product = {
      ...data,
      price: (data.price / 100) / 10, // Kuruş → TL → /10
      original_price: data.original_price ? (data.original_price / 100) / 10 : null,
    }
    
    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add product' },
      { status: 500 }
    )
  }
}
