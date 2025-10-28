import { NextRequest, NextResponse } from 'next/server'
import getIyzipay, { getIyzicoCredentials } from '@/lib/iyzico'
import { createSupabaseServer } from '@/lib/supabase/server'

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

    // Detect current domain dynamically
    const getBaseUrl = () => {
      if (typeof window !== 'undefined') {
        // Client-side
        return window.location.origin
      }
      // Server-side - try to get from request or use default
      const host = request.headers.get('host')
      if (host) {
        return `https://${host}`
      }
      return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:1700'
    }
    
    const callbackUrl = `${getBaseUrl()}/payment/callback`

    // Generate order number and conversation ID (Iyzico requires unique random string starting with letter)
    const random = Math.random().toString(36).substring(2, 15) // Generate random alphanumeric string
    const timestamp = Date.now()
    const orderNumber = `ORD-${timestamp}-${random.toUpperCase()}`
    // conversationId must start with a letter (Iyzico requirement)
    const conversationId = `conv${timestamp}${random}`.substring(0, 100) // Max 100 chars, starts with letter

    // Prepare iyzico payment request
    const iyzipayRequest = {
      locale: 'tr',
      conversationId: conversationId, // Iyzico requires unique random string (max 100 chars)
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
        id: 'guest',
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

    // Check if real Iyzico credentials are available
    const credentials = getIyzicoCredentials()
    const hasIyzicoKeys = !!credentials

    // Create order in Supabase
    let supabase = null
    let userId = 'guest'
    
    try {
      supabase = await createSupabaseServer()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch (error) {
      console.error('Supabase auth error:', error)
    }

    // Insert order into Supabase
    try {
      if (supabase) {
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            user_id: userId !== 'guest' ? userId : null,
            customer_name: customer.name || '',
            customer_email: customer.email || '',
            customer_phone: customer.phone || '',
            shipping_address: {
              address: customer.address || '',
              city: customer.city || '',
              zipcode: customer.zipCode || ''
            } as any,
            billing_address: null,
            items: items.map(item => ({
              product_id: item.id,
              name: item.name,
              price: item.price * 100, // Store in kuruş
              quantity: item.quantity || 1
            })) as any,
            subtotal: Math.round(totalPrice * 100), // Store in kuruş
            shipping_cost: 0,
            total: Math.round(totalPrice * 100), // Store in kuruş
            status: 'pending',
            payment_method: 'iyzico',
            payment_status: 'pending',
            payment_token: null
          })

        if (orderError) {
          console.error('Supabase order creation error:', orderError)
        } else {
          console.log('✅ Order created in Supabase:', orderNumber)
        }
      }
    } catch (error) {
      console.error('Order creation error:', error)
    }

    // If no Iyzico credentials, use mock payment for testing
    if (!hasIyzicoKeys) {
      console.log('⚠️ Using mock payment - Iyzico credentials not configured')
      return NextResponse.json({
        success: true,
        token: `test-token-${Date.now()}`,
        paymentPageUrl: `${callbackUrl}?token=test-token-${Date.now()}&status=success&orderNumber=${orderNumber}`,
        orderNumber
      })
    }

    // Real Iyzico payment integration
    try {
      const response = await fetch(`${credentials!.baseUrl}/payment/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${credentials!.apiKey}:${credentials!.secretKey}`).toString('base64')}`
        },
        body: JSON.stringify(iyzipayRequest)
      })

      const paymentResult = await response.json()

      if (paymentResult.status === 'success') {
        return NextResponse.json({
          success: true,
          token: paymentResult.conversationId,
          paymentPageUrl: paymentResult.paymentPageUrl,
          orderNumber
        })
      } else {
        console.error('Iyzico payment error:', paymentResult.errorMessage)
        return NextResponse.json({
          success: false,
          error: paymentResult.errorMessage || 'Ödeme işlemi başarısız'
        }, { status: 400 })
      }
    } catch (error: any) {
      console.error('Iyzico API error:', error)
      return NextResponse.json({
        success: false,
        error: error.message || 'Ödeme başlatılamadı'
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Payment initialization error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Ödeme başlatılamadı' 
    }, { status: 500 })
  }
}


