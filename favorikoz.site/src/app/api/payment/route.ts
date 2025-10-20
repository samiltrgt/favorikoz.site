import { NextRequest, NextResponse } from 'next/server'

type BasketItem = {
  id: string
  name: string
  category: string
  price: number
}

function toPriceString(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items: BasketItem[] = body.items || []
    const customer = body.customerInfo || {}

    const price = items.reduce((sum, i) => sum + (i.price || 0), 0)
    const priceStr = toPriceString(price)

    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/callback`

    // Test mode - always return mock response for now
    return NextResponse.json({ 
      success: true, 
      token: 'test-token-' + Date.now(),
      paymentPageUrl: '/payment/callback?token=test-token-' + Date.now() + '&status=success'
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}


