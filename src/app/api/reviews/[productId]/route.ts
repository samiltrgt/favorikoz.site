import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// GET /api/reviews/:productId - Get all reviews for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = await createSupabaseServer()
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        verified,
        created_at,
        guest_name,
        user_id,
        profiles:user_id (
          name
        )
      `)
      .eq('product_id', params.productId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }
    
    // Format reviews
    const reviews = data.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      verified: review.verified,
      author: review.profiles?.name || review.guest_name || 'Anonim',
      date: new Date(review.created_at).toLocaleDateString('tr-TR'),
    }))
    
    return NextResponse.json({ success: true, data: reviews })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST /api/reviews/:productId - Add a review
export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()
    
    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Validate input
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }
    
    if (!body.comment || body.comment.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Comment must be at least 10 characters' },
        { status: 400 }
      )
    }
    
    // Check if product exists
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', params.productId)
      .single()
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Insert review
    const reviewData: any = {
      product_id: params.productId,
      rating: body.rating,
      comment: body.comment.trim(),
      verified: false, // Will be set to true by admin
    }
    
    if (user) {
      reviewData.user_id = user.id
    } else {
      // Guest review
      reviewData.guest_name = body.name?.trim() || 'Anonim'
    }
    
    const { data, error } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add review' },
        { status: 500 }
      )
    }
    
    // Update product rating (calculate average)
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', params.productId)
    
    if (allReviews && allReviews.length > 0) {
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      const roundedRating = Math.round(avgRating * 10) / 10 // Round to 1 decimal
      
      await supabase
        .from('products')
        .update({
          rating: roundedRating,
          reviews_count: allReviews.length,
        })
        .eq('id', params.productId)
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Review submitted successfully. It will be visible after admin approval.' 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add review' },
      { status: 500 }
    )
  }
}

