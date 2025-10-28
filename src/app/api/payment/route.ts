import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import iyzipay from '@/lib/iyzico'

type BasketItem = {
  id: string
  name: string
  category: string
  price: number
  quantity?: number
}

function toPriceString(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items: BasketItem[] = body.items || []
    const customer = body.customerInfo || {}

    if (!items.length) {
      return NextResponse.json({ success: false, error: 'Sepet boş' }, { status: 400 })
    }

    const totalPrice = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0)
    const priceStr = toPriceString(totalPrice)

    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:1700'}/payment/callback`

    // Create order in Supabase
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Prepare iyzico payment request
    const iyzipayRequest = {
      locale: 'tr',
      conversationId: orderNumber,
      price: priceStr,
      paidPrice: priceStr,
      currency: 'TRY',
      installment: '1',
      basketId: orderNumber,
      paymentCard: {
        cardHolderName: `${customer.name} ${customer.surname}`,
        cardNumber: customer.cardNumber?.replace(/\s/g, '') || '',
        expireMonth: customer.expireMonth || '',
        expireYear: customer.expireYear || '',
        cvc: customer.cvc || '',
        registerCard: '0'
      },
      buyer: {
        id: user?.id || 'guest',
        name: customer.name || '',
        surname: customer.surname || '',
        gsmNumber: customer.phone || '',
        email: customer.email || '',
        identityNumber: customer.tc || '',
        lastLoginDate: new Date().toISOString(),
        registrationDate: new Date().toISOString(),
        registrationAddress: customer.address || '',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1',
        city: customer.city || '',
        country: 'Turkey',
        zipCode: customer.zipCode || ''
      },
      shippingAddress: {
        contactName: `${customer.name} ${customer.surname}`,
        city: customer.city || '',
        country: 'Turkey',
        address: customer.address || '',
        zipCode: customer.zipCode || ''
      },
      billingAddress: {
        contactName: `${customer.name} ${customer.surname}`,
        city: customer.city || '',
        country: 'Turkey',
        address: customer.address || '',
        zipCode: customer.zipCode || ''
      },
      basketItems: items.map(item => ({
        id: item.id,
        name: item.name,
        category1: item.category || 'Genel',
        itemType: 'PHYSICAL',
        price: toPriceString(item.price)
      })),
      callbackUrl,
      options: {
        currency: 'TRY'
      }
    }

    // For test mode, return mock response
    const isProduction = process.env.NODE_ENV === 'production'
    const hasIyzicoKeys = process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY

    if (!hasIyzicoKeys || !isProduction) {
      // Mock response for development/test
      return NextResponse.json({ 
        success: true, 
        token: `test-token-${Date.now()}`,
        paymentPageUrl: `${callbackUrl}?token=test-token-${Date.now()}&status=success&orderNumber=${orderNumber}`,
        orderNumber
      })
    }

    // Real iyzico integration (production)
    const paymentResult = await new Promise((resolve, reject) => {
      iyzipay.threedsInitialize.create(iyzipayRequest, (err: any, result: any) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    })

    // Return payment URL
    return NextResponse.json({
      success: true,
      token: orderNumber,
      paymentPageUrl: (paymentResult as any).threeDSHtmlContent || `${callbackUrl}?token=${orderNumber}`
    })

  } catch (error: any) {
    console.error('Payment initialization error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Ödeme başlatılamadı' 
    }, { status: 500 })
  }
}


