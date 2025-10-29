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
    const timestamp = Date.now()
    // Generate multiple random strings for truly unique conversationId
    const random1 = Math.random().toString(36).substring(2, 15)
    const random2 = Math.random().toString(36).substring(2, 15)
    const random3 = Math.random().toString(36).substring(2, 11)
    
    // Get random alphabet character for first letter
    const firstLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26)) // a-z
    
    const orderNumber = `ORD-${timestamp}-${random1.toUpperCase()}`
    // conversationId must be truly random and start with a letter (Iyzico requirement)
    const conversationId = `${firstLetter}${random1}${random2}${random3}${timestamp}`.substring(0, 100)
    // basketId must also be random (Iyzico requirement)
    const basketIdFirstLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26)) // a-z
    const basketId = `${basketIdFirstLetter}${random2}${random3}${random1}${timestamp}`.substring(0, 100)
    // buyer.id must be random (Iyzico requirement - not "guest")
    const buyerIdFirstLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26)) // a-z
    const buyerId = `${buyerIdFirstLetter}${random1}${random3}${timestamp}`.substring(0, 64)

    // Prepare iyzico payment request
    const iyzipayRequest = {
      locale: 'tr',
      conversationId: conversationId, // Iyzico requires unique random string (max 100 chars)
      price: priceStr,
      paidPrice: priceStr,
      currency: 'TRY',
      installment: '1',
      basketId: basketId, // Must be random string (Iyzico requirement)
      paymentCard: {
        cardHolderName: `${customer.name} ${customer.surname}`,
        cardNumber: customer.cardNumber?.replace(/\s/g, '') || '',
        expireMonth: customer.expireMonth || '',
        expireYear: customer.expireYear || '',
        cvc: customer.cvc || '',
        registerCard: '0'
      },
      buyer: {
        id: buyerId, // Must be random string (Iyzico requirement, not "guest")
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

    // Real Iyzico payment integration using SDK
    try {
      // Get Iyzico SDK instance
      const iyzipay = getIyzipay()
      
      if (!iyzipay) {
        console.error('❌ Iyzico SDK could not be initialized')
        return NextResponse.json({
          success: false,
          error: 'Ödeme sistemi başlatılamadı'
        }, { status: 500 })
      }

      console.log('📤 Sending Iyzico payment request via SDK:', {
        conversationId,
        basketId,
        buyerId,
        totalAmount: priceStr
      })

      // Use SDK's payment.create method
      // SDK automatically handles hash signature, headers, and authentication
      return new Promise((resolve) => {
        iyzipay.payment.create(iyzipayRequest, (err: any, result: any) => {
          if (err) {
            console.error('❌ Iyzico SDK error:', err)
            resolve(NextResponse.json({
              success: false,
              error: err.message || 'Ödeme başlatılamadı'
            }, { status: 500 }))
            return
          }

          console.log('📥 Iyzico SDK response:', {
            status: result.status,
            errorMessage: result.errorMessage,
            paymentPageUrl: result.paymentPageUrl
          })

          if (result.status === 'success') {
            resolve(NextResponse.json({
              success: true,
              token: result.conversationId || conversationId,
              paymentPageUrl: result.paymentPageUrl,
              orderNumber
            }))
          } else {
            console.error('❌ Iyzico payment error:', result.errorMessage || result)
            resolve(NextResponse.json({
              success: false,
              error: result.errorMessage || JSON.stringify(result) || 'Ödeme işlemi başarısız'
            }, { status: 400 }))
          }
        })
      })

    } catch (error: any) {
      console.error('❌ Iyzico SDK error:', error)
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


