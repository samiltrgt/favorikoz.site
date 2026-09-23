import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { buildIyzicoPaidPriceFromOrder } from '../src/lib/iyzico-payment-amount'

dotenv.config({ path: '.env.local' })

async function main() {
  const iyzicoUrl = process.env.IYZICO_BASE_URL || '(default sandbox)'
  const hasIyzico = !!(process.env.IYZICO_API_KEY?.trim() && process.env.IYZICO_SECRET_KEY?.trim())
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '(missing)'
  const callbackUrl = process.env.IYZICO_CALLBACK_URL || '(uses NEXT_PUBLIC_BASE_URL)'
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const isSandbox = iyzicoUrl.includes('sandbox')

  console.log('=== Ödeme yapılandırması ===')
  console.log('Iyzico keys:', hasIyzico ? 'VAR' : 'YOK (mock ödeme)')
  console.log('IYZICO_BASE_URL:', iyzicoUrl, isSandbox ? '⚠️ SANDBOX' : '✅ CANLI')
  console.log('NEXT_PUBLIC_BASE_URL:', baseUrl)
  console.log('IYZICO_CALLBACK_URL:', callbackUrl)
  console.log('SUPABASE_SERVICE_ROLE_KEY:', hasServiceRole ? 'VAR' : '❌ YOK (3DS callback kırılır)')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: recent } = await supabase
    .from('orders')
    .select('order_number,payment_status,status,created_at,coupon_code,total,shipping_cost,items,discount_amount')
    .order('created_at', { ascending: false })
    .limit(20)

  const paid = recent?.filter((o) => o.payment_status === 'completed').length ?? 0
  const pending = recent?.filter((o) => o.payment_status === 'pending').length ?? 0

  console.log('\n=== Son 20 sipariş ===')
  console.log('completed:', paid, '| pending:', pending)
  for (const o of recent ?? []) {
    console.log(
      o.created_at?.slice(0, 16),
      o.payment_status?.padEnd(9),
      o.coupon_code ? `kupon:${o.coupon_code}` : 'kupon-yok',
      o.order_number?.slice(0, 28)
    )
  }

  const withCoupon = recent?.find((o) => o.coupon_code && o.payment_status === 'pending')
  if (withCoupon) {
    const built = buildIyzicoPaidPriceFromOrder({
      items: withCoupon.items,
      shipping_cost: withCoupon.shipping_cost ?? 0,
      total: withCoupon.total,
      discount_amount: withCoupon.discount_amount,
    })
    const expected = ((withCoupon.total ?? 0) / 100).toFixed(2)
    console.log('\n=== Kuponlu pending sipariş tutar kontrolü ===')
    console.log('DB total (TL):', expected)
    console.log('3DS v2 buildIyzicoPaidPrice (TL):', built)
    console.log('Tutar uyumsuz mu:', built !== expected ? '⚠️ EVET — kuponlu ödemeler 3DS v2\'de takılabilir' : 'Hayır')
  }

  const lastPaid = recent?.find((o) => o.payment_status === 'completed')
  if (lastPaid) {
    console.log('\nSon başarılı ödeme:', lastPaid.created_at?.slice(0, 16), lastPaid.order_number)
  } else {
    console.log('\n⚠️ Son 20 siparişte completed ödeme yok')
  }
}

main().catch(console.error)
