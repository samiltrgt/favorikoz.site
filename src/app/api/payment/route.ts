import { NextRequest, NextResponse } from 'next/server'
import { getIyzicoCredentials, initialize3DSPayment } from '@/lib/iyzico'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import { getCustomerIdentityKey, validateCouponForSubtotal } from '@/lib/coupons'

type BasketItem = {
  id: string
  name: string
  category: string
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

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items: BasketItem[] = body.items || []
    const customer = body.customerInfo || {}
    const couponCode = (body.couponCode || '').toString()

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

    let ordersClient: any
    try {
      ordersClient = createSupabaseAdmin()
    } catch {
      ordersClient = await createSupabaseServer()
    }
    const requestedProductIds = items.map((item) => item.id).filter(Boolean)
    const { data: products, error: productsError } = await ordersClient
      .from('products')
      .select('id, name, category_slug, price, in_stock, stock_quantity')
      .in('id', requestedProductIds)

    if (productsError || !products?.length) {
      return NextResponse.json({ success: false, error: 'Ürünler doğrulanamadı' }, { status: 400 })
    }

    const productRows = (products || []) as any[]
    const productsById = new Map(productRows.map((p) => [p.id, p]))
    const canonicalItems = items.map((item) => {
      const product = productsById.get(item.id)
      const quantity = Math.max(1, Number(item.quantity || 1))
      if (!product) {
        throw new Error('Sepette geçersiz ürün bulundu')
      }
      if (!product.in_stock || product.stock_quantity < quantity) {
        throw new Error(`${product.name} için yeterli stok bulunmuyor`)
      }
      // products.price is kuruş, convert to 10x display format
      const unitPrice10x = Math.round(Number(product.price) / 100)
      return {
        id: product.id,
        name: product.name,
        category: product.category_slug || 'Genel',
        quantity,
        unitPrice10x,
      }
    })

    const subtotalBeforeCoupon10x = canonicalItems.reduce((sum, i) => sum + i.unitPrice10x * i.quantity, 0)

    let discountAmount10x = 0
    let subtotalAfterCoupon10x = subtotalBeforeCoupon10x
    let appliedCoupon: {
      code: string
      discount_type: 'percent' | 'fixed'
      discount_value: number
    } | null = null

    const customerIdentityKey = getCustomerIdentityKey(customer.email || '')
    if (couponCode) {
      const couponResult = await validateCouponForSubtotal({
        supabase: ordersClient,
        couponCode,
        subtotal10x: subtotalBeforeCoupon10x,
        customerIdentityKey,
      })
      if (!couponResult.valid) {
        return NextResponse.json({ success: false, error: couponResult.error }, { status: 400 })
      }
      discountAmount10x = couponResult.discountAmount10x
      subtotalAfterCoupon10x = couponResult.subtotalAfterDiscount10x
      appliedCoupon = {
        code: couponResult.coupon.code,
        discount_type: couponResult.coupon.discount_type,
        discount_value: Number(couponResult.coupon.discount_value),
      }
    }

    // Calculate shipping: free if >= 1499 TL (14990 in 10x format), otherwise 100 TL (1000 in 10x format)
    // Optional one-time test override via env:
    // TEST_FREE_SHIPPING_EMAIL=ornek@mail.com
    const FREE_SHIPPING_THRESHOLD = 14990 // 1499 TL (10x formatında)
    const SHIPPING_COST = 1000 // 100 TL (10x formatında)
    const testFreeShippingEmail = (process.env.TEST_FREE_SHIPPING_EMAIL || '').trim().toLowerCase()
    const customerEmail = (customer.email || '').toString().trim().toLowerCase()
    const isOneTimeTestShippingFree = !!testFreeShippingEmail && customerEmail === testFreeShippingEmail
    const shipping10x = isOneTimeTestShippingFree
      ? 0
      : subtotalAfterCoupon10x >= FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_COST

    // Total price in 10x format
    const totalPrice10x = subtotalAfterCoupon10x + shipping10x

    // Iyzico: Gönderilen tutar = tüm kırılımların toplamı olmalı. Basket kalemleri satır toplamı + kargo.
    const basketItemsForIyzico: { id: string; name: string; category1: string; itemType: string; price: string }[] = canonicalItems.map((item) => {
      const lineTotalTL = (item.unitPrice10x * item.quantity) / 10
      return {
        id: item.id,
        name: item.name,
        category1: item.category,
        itemType: 'PHYSICAL',
        price: toPriceString(lineTotalTL),
      }
    })

    // Apply coupon discount as a separate virtual line item so iyzico item sum equals total.
    if (discountAmount10x > 0) {
      basketItemsForIyzico.push({
        id: 'coupon-discount',
        name: `Kupon İndirimi${appliedCoupon ? ` (${appliedCoupon.code})` : ''}`,
        category1: 'İndirim',
        itemType: 'VIRTUAL',
        price: toPriceString(-(discountAmount10x / 10)),
      })
    }

    if (shipping10x > 0) {
      basketItemsForIyzico.push({
        id: 'shipping',
        name: 'Kargo',
        category1: 'Kargo',
        itemType: 'VIRTUAL',
        price: toPriceString(shipping10x / 10),
      })
    }
    const sumBasketTL = basketItemsForIyzico.reduce((sum, b) => sum + parseFloat(b.price), 0)
    const priceStr = toPriceString(sumBasketTL)

    // 3DS callback URL:
    // 1) IYZICO_CALLBACK_URL (explicit)
    // 2) NEXT_PUBLIC_BASE_URL + /payment/callback
    // 3) request host fallback
    const envCallback = process.env.IYZICO_CALLBACK_URL?.trim()
    const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim()
    const host = request.headers.get('host') || 'localhost:1700'
    const callbackBase = envCallback
      ? envCallback
      : envBase
      ? `${stripTrailingSlash(envBase)}/payment/callback`
      : `https://${host}/payment/callback`
    const callbackUrl = callbackBase.endsWith('/payment/callback')
      ? callbackBase.replace(/\/payment\/callback$/, '/api/payment/3ds-callback')
      : callbackBase

    if (!callbackUrl.startsWith('http://') && !callbackUrl.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'IYZICO callback URL geçersiz. IYZICO_CALLBACK_URL veya NEXT_PUBLIC_BASE_URL kontrol edin.' },
        { status: 500 }
      )
    }

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
      if (ordersClient) {
        const { error: orderError } = await ordersClient
          .from('orders')
          .insert({
            order_number: orderNumber,
            user_id: userId !== 'guest' ? userId : null,
            customer_name: customer.name || '',
            customer_email: customer.email || '',
            customer_phone: customer.phone || '',
            customer_tc: tc || null,
            shipping_address: {
              address: customer.address || '',
              city: customer.city || '',
              zipcode: customer.zipCode || ''
            } as any,
            billing_address: null,
            items: canonicalItems.map((item) => ({
              product_id: item.id,
              name: item.name,
              price: item.unitPrice10x * 10, // 10x to kuruş
              quantity: item.quantity,
            })) as any,
            subtotal: Math.round(subtotalAfterCoupon10x * 10),
            shipping_cost: Math.round(shipping10x * 10),
            total: Math.round(totalPrice10x * 10),
            coupon_code: appliedCoupon?.code || null,
            coupon_discount_type: appliedCoupon?.discount_type || null,
            coupon_discount_value: appliedCoupon?.discount_value || null,
            discount_amount: Math.round(discountAmount10x * 10),
            subtotal_before_coupon: Math.round(subtotalBeforeCoupon10x * 10),
            subtotal_after_coupon: Math.round(subtotalAfterCoupon10x * 10),
            status: 'pending',
            payment_method: 'iyzico',
            payment_status: 'pending',
            payment_token: conversationId,
            iyzico_basket_id: basketId,
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

      // Canlıda zorunlu 3DS için initialize akışı
      const result = await initialize3DSPayment(iyzipayRequest)

      if (result.status === 'success') {
        // 3DS sayfası açılmalı
        if (result.threeDSHtmlContent || result.threeDSHtmlContent?.length > 0) {
          return NextResponse.json({
            success: true,
            requires3DS: true,
            threeDSHtmlContent: result.threeDSHtmlContent,
            conversationId: result.conversationId || conversationId,
            orderNumber
          })
        }
        return NextResponse.json({
          success: false,
          error: '3DS başlatılamadı',
        }, { status: 400 })
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


