import { NextRequest, NextResponse } from 'next/server'
import { getIyzicoCredentials, initialize3DSPayment } from '@/lib/iyzico'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import { getCustomerIdentityKey, validateCouponForSubtotal } from '@/lib/coupons'
import { allocateIyzicoDiscount } from '@/lib/iyzico-payment-amount'
import { kurusToTl } from '@/lib/price'
import { calculateCheckoutTotals } from '@/lib/checkout-pricing'
import { captureOrderTracking } from '@/lib/tracking/identity'

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
    const customerEmail = typeof customer.email === 'string' ? customer.email.trim().toLowerCase() : ''
    const couponCode = (body.couponCode || '').toString()
    const tracking = (body.tracking && typeof body.tracking === 'object' ? body.tracking : {}) as Record<
      string,
      unknown
    >

    // IP istemciden alınmaz — yalnızca proxy başlığı
    const forwarded = request.headers.get('x-forwarded-for') || ''
    const clientIp = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
    const clientUa = request.headers.get('user-agent') || null

    let trackingFields = {
      fbp: typeof tracking.fbp === 'string' ? tracking.fbp.slice(0, 256) : null,
      fbc: typeof tracking.fbc === 'string' ? tracking.fbc.slice(0, 256) : null,
      fbclid: typeof tracking.fbclid === 'string' ? tracking.fbclid.slice(0, 256) : null,
      gclid: typeof tracking.gclid === 'string' ? tracking.gclid.slice(0, 256) : null,
      gbraid: typeof tracking.gbraid === 'string' ? tracking.gbraid.slice(0, 256) : null,
      wbraid: typeof tracking.wbraid === 'string' ? tracking.wbraid.slice(0, 256) : null,
      utm_source: typeof tracking.utm_source === 'string' ? tracking.utm_source.slice(0, 256) : null,
      utm_medium: typeof tracking.utm_medium === 'string' ? tracking.utm_medium.slice(0, 256) : null,
      utm_campaign: typeof tracking.utm_campaign === 'string' ? tracking.utm_campaign.slice(0, 256) : null,
      utm_content: typeof tracking.utm_content === 'string' ? tracking.utm_content.slice(0, 256) : null,
      utm_term: typeof tracking.utm_term === 'string' ? tracking.utm_term.slice(0, 256) : null,
      client_ip: clientIp ? clientIp.slice(0, 64) : null,
      client_user_agent: clientUa ? clientUa.slice(0, 512) : null,
    }

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
      return NextResponse.json({ success: false, error: 'Sipariş altyapısı yapılandırılmamış' }, { status: 503 })
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
      const quantity = Number(item.quantity ?? 1)
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
        throw new Error('Sepette geçersiz ürün adedi bulundu')
      }
      if (!product) {
        throw new Error('Sepette geçersiz ürün bulundu')
      }
      if (!product.in_stock || product.stock_quantity < quantity) {
        throw new Error(`${product.name} için yeterli stok bulunmuyor`)
      }
      const unitPriceKurus = Number(product.price)
      if (!Number.isSafeInteger(unitPriceKurus) || unitPriceKurus <= 0) {
        throw new Error('Sepette geçersiz ürün fiyatı bulundu')
      }
      return {
        id: product.id,
        name: product.name,
        category: product.category_slug || 'Genel',
        quantity,
        unitPriceKurus,
      }
    })

    const subtotalBeforeCouponKurus = canonicalItems.reduce((sum, i) => sum + i.unitPriceKurus * i.quantity, 0)
    if (!Number.isSafeInteger(subtotalBeforeCouponKurus)) {
      return NextResponse.json({ success: false, error: 'Sepet tutarı geçersiz' }, { status: 400 })
    }

    let discountAmountKurus = 0
    let subtotalAfterCouponKurus = subtotalBeforeCouponKurus
    let appliedCoupon: {
      code: string
      discount_type: 'percent' | 'fixed'
      discount_value: number
    } | null = null

    const customerIdentityKey = getCustomerIdentityKey(customerEmail)
    if (couponCode) {
      const couponResult = await validateCouponForSubtotal({
        supabase: ordersClient,
        couponCode,
        subtotalKurus: subtotalBeforeCouponKurus,
        customerIdentityKey,
      })
      if (!couponResult.valid) {
        return NextResponse.json({ success: false, error: couponResult.error }, { status: 400 })
      }
      discountAmountKurus = couponResult.discountAmountKurus
      subtotalAfterCouponKurus = couponResult.subtotalAfterDiscountKurus
      appliedCoupon = {
        code: couponResult.coupon.code,
        discount_type: couponResult.coupon.discount_type,
        discount_value: Number(couponResult.coupon.discount_value),
      }
    }

    const totals = calculateCheckoutTotals(subtotalBeforeCouponKurus, discountAmountKurus)
    const { shippingKurus, totalKurus } = totals
    if (body.expectedTotalKurus !== undefined && body.expectedTotalKurus !== totalKurus) {
      return NextResponse.json({ success: false, error: 'Fiyat değişti. Lütfen sepeti yenileyin.' }, { status: 409 })
    }

    // Iyzico rejects non-positive basket lines. Spread coupons across actual products.
    let discountedLineKurus: number[]
    try {
      discountedLineKurus = allocateIyzicoDiscount(
        canonicalItems.map((item) => item.unitPriceKurus * item.quantity),
        discountAmountKurus
      )
    } catch (error) {
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Kupon indirimi geçersiz' }, { status: 400 })
    }
    const basketItemsForIyzico: { id: string; name: string; category1: string; itemType: string; price: string }[] = canonicalItems.map((item, index) => {
      return {
        id: item.id,
        name: item.name,
        category1: item.category,
        itemType: 'PHYSICAL',
        price: toPriceString(discountedLineKurus[index] / 100),
      }
    })

    if (shippingKurus > 0) {
      basketItemsForIyzico.push({
        id: 'shipping',
        name: 'Kargo',
        category1: 'Kargo',
        itemType: 'VIRTUAL',
        price: toPriceString(kurusToTl(shippingKurus)),
      })
    }
    const basketTotalKurus = discountedLineKurus.reduce((sum, price) => sum + price, 0) + shippingKurus
    if (basketTotalKurus !== totalKurus) {
      return NextResponse.json({ success: false, error: 'Kupon indirimi ile ödeme tutarı uyuşmuyor' }, { status: 400 })
    }
    const priceStr = toPriceString(basketTotalKurus / 100)

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
        email: customerEmail,
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
    if (!credentials) {
      return NextResponse.json({ success: false, error: 'Ödeme altyapısı yapılandırılmamış' }, { status: 503 })
    }

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

    const orderTracking = captureOrderTracking(request, tracking, userId !== 'guest' ? userId : undefined)
    // Keep existing attribution columns for reporting, with the same consent gate as JSON.
    trackingFields = Object.fromEntries(
      Object.keys(trackingFields).map((key) => [key,
        key === 'client_ip' ? orderTracking.ip ?? null :
        key === 'client_user_agent' ? orderTracking.user_agent ?? null :
        orderTracking[key] ?? null])
    ) as typeof trackingFields

    // Insert order into Supabase
    try {
      if (ordersClient) {
        const { error: orderError } = await ordersClient
          .from('orders')
          .insert({
            order_number: orderNumber,
            user_id: userId !== 'guest' ? userId : null,
            customer_name: customer.name || '',
            customer_email: customerEmail,
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
              price: item.unitPriceKurus,
              quantity: item.quantity,
            })) as any,
            subtotal: subtotalAfterCouponKurus,
            shipping_cost: shippingKurus,
            total: totalKurus,
            coupon_code: appliedCoupon?.code || null,
            coupon_discount_type: appliedCoupon?.discount_type || null,
            coupon_discount_value: appliedCoupon?.discount_value || null,
            discount_amount: discountAmountKurus,
            subtotal_before_coupon: subtotalBeforeCouponKurus,
            subtotal_after_coupon: subtotalAfterCouponKurus,
            status: 'pending',
            payment_method: 'iyzico',
            payment_status: 'pending',
            payment_token: conversationId,
            iyzico_basket_id: basketId,
            ...trackingFields,
            tracking: orderTracking,
          })

        if (orderError) {
          console.error('Supabase order creation error:', orderError)
          return NextResponse.json({ success: false, error: 'Sipariş kaydedilemedi. Lütfen tekrar deneyin.' }, { status: 503 })
        } else {
          console.log('✅ Order created in Supabase:', orderNumber)
        }
      }
    } catch (error) {
      console.error('Order creation error:', error)
      return NextResponse.json({ success: false, error: 'Sipariş kaydedilemedi. Lütfen tekrar deneyin.' }, { status: 503 })
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
          status: 'pending', conversationId, orderNumber,
          error: 'Ödeme sonucu doğrulanamadı. Lütfen yeniden ödeme yapmadan sipariş durumunu kontrol edin.',
        }, { status: 400 })
      } else {
        return NextResponse.json({
          success: false,
          status: 'pending', conversationId, orderNumber,
          error: 'Ödeme başlatılamadı; ödeme sonucu kontrol edilmeli.',
          errorCode: result.errorCode
        }, { status: 400 })
      }

    } catch (error: any) {
      console.error('❌ Iyzico error:', error)
      return NextResponse.json({
        success: false,
        status: 'pending', conversationId, orderNumber,
        error: 'Ödeme sonucu doğrulanamadı. Lütfen yeniden ödeme yapmadan sipariş durumunu kontrol edin.'
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


