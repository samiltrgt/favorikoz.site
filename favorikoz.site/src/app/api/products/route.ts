import { NextRequest, NextResponse } from 'next/server'
import { readProducts, addProduct } from '@/lib/database'

// GET /api/products - Get all products
export async function GET() {
  try {
    const products = readProducts()
    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Add new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const newProduct = addProduct(body)
    return NextResponse.json({ success: true, data: newProduct })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to add product' },
      { status: 500 }
    )
  }
}
