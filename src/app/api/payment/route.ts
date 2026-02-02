import { NextRequest, NextResponse } from 'next/server'
import { getIyzicoCredentials, createPayment } from '@/lib/iyzico'
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

function toIyzicoDate(date: Date): string {
  // Iyzico format: YYYY-MM-DD HH:mm:ss
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items: BasketItem[] = body.items || []
    const customer = body.customerInfo || {}

    if (!items.length) {
      return NextResponse.json({ success: false, error: 'Sepet boş' }, { status: 400 })
    }

    const tc = (customer.tc || '').toString().replace(/\s/g, '')
    if (!tc || tc.length !== 11 || !/^[0-9]{11}$/.test(tc)) {
      return NextResponse.json(
        { success: false, error: 'Geçerli 11 haneli TC Kimlik No zorunludur' },
        { status: 400 }
      )
    }

    // Calculate subtotal (prices are in 10x format: 100 TL = 1000)
    const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0)
    
    // Calculate shipping: free if >= 1499 TL (14990 in 10x format), otherwise 100 TL (1000 in 10x format)
    const FREE_SHIPPING_THRESHOLD = 14990 // 1499 TL (10x formatında)
    const SHIPPING_COST = 1000 // 100 TL (10x formatında)
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
    
    // Total price in 10x format
    const totalPrice = subtotal + shipping

    // Iyzico: Gönderilen tutar = tüm kırılımların toplamı olmalı. Basket kalemleri satır toplamı + kargo.
    const basketItemsForIyzico: { id: string; name: string; category1: string; itemType: string; price: string }[] = items.map(item => {
      const qty = item.quantity || 1
      const lineTotalTL = ((item.price || 0) * qty) / 10 // satır toplamı TL
      return {
        id: item.id,
        name: item.name,
        category1: item.category || 'Genel',
        itemType: 'PHYSICAL',
        price: toPriceString(lineTotalTL),
      }
    })
    if (shipping > 0) {
      basketItemsForIyzico.push({
        id: 'shipping',
        name: 'Kargo',
        category1: 'Kargo',
        itemType: 'VIRTUAL',
        price: toPriceString(shipping / 10),
      })
    }
    const sumBasketTL = basketItemsForIyzico.reduce((sum, b) => sum + parseFloat(b.price), 0)
    const priceStr = toPriceString(sumBasketTL)

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
        identityNumber: tc,
        lastLoginDate: toIyzicoDate(new Date()),
        registrationDate: toIyzicoDate(new Date()),
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
      basketItems: basketItemsForIyzico,
      callbackUrl,
      options: {
        currency: 'TRY'
      }
    }

    // Check if Iyzico SDK available
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
              price: item.price * 10, // Store in kuruş (item.price is in 10x format, so *10 = kuruş: 255 * 10 = 2550)
              quantity: item.quantity || 1
            })) as any,
            subtotal: Math.round(subtotal * 10), // Store in kuruş (subtotal is in 10x format, so *10 = kuruş: 2550 * 10 = 25500)
            shipping_cost: Math.round(shipping * 10), // Store in kuruş (shipping is in 10x format, so *10 = kuruş: 1000 * 10 = 10000)
            total: Math.round(totalPrice * 10), // Store in kuruş (totalPrice is in 10x format, so *10 = kuruş: 3550 * 10 = 35500)
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
      if (!credentials) {
        throw new Error('Iyzico credentials not available')
      }

      // Call Iyzico REST API
      const result = await createPayment(iyzipayRequest)

      if (result.status === 'success') {
        // Handle 3DS authentication
        if (result.threeDSHtmlContent) {
          return NextResponse.json({
            success: true,
            requires3DS: true,
            threeDSHtmlContent: result.threeDSHtmlContent,
            conversationId: result.conversationId || conversationId,
            orderNumber
          })
        } else {
          // Direct success - redirect to callback
          return NextResponse.json({
            success: true,
            paymentPageUrl: `${callbackUrl}?token=${result.conversationId || conversationId}&status=success&orderNumber=${orderNumber}`,
            token: result.conversationId || conversationId,
            paymentId: result.paymentId,
            orderNumber
          })
        }
      } else {
        return NextResponse.json({
          success: false,
          error: result.errorMessage || 'Ödeme işlemi başarısız',
          errorCode: result.errorCode
        }, { status: 400 })
      }

    } catch (error: any) {
      console.error('❌ Iyzico error:', error)
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


