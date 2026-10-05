import dotenv from 'dotenv'
dotenv.config({ path: '.env.local', quiet: true })

// Report presence only. Never print credentials, response bodies or order/customer data.
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'META_PIXEL_ID', 'META_CAPI_ACCESS_TOKEN', 'CRON_SECRET']
const optional = ['NEXT_PUBLIC_TRACKING_MODE', 'NEXT_PUBLIC_META_PIXEL_ID', 'NEXT_PUBLIC_GA4_MEASUREMENT_ID', 'GA4_MEASUREMENT_ID', 'GA4_API_SECRET', 'NEXT_PUBLIC_GOOGLE_ADS_ID', 'NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL']
let failed = false
for (const key of required) {
  const present = Boolean(process.env[key]?.trim())
  console.log(`${present ? 'OK' : 'MISSING'} ${key}`)
  if (!present) failed = true
}
for (const key of optional) console.log(`${process.env[key]?.trim() ? 'SET' : 'UNSET'} ${key}`)
if (process.argv.includes('--require-google')) {
  for (const key of ['NEXT_PUBLIC_GA4_MEASUREMENT_ID', 'GA4_API_SECRET', 'NEXT_PUBLIC_GOOGLE_ADS_ID', 'NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL']) {
    if (!process.env[key]?.trim()) { console.log(`MISSING GOOGLE ${key}`); failed = true }
  }
}
if (process.env.META_TEST_EVENT_CODE?.trim()) console.log('NOTICE META_TEST_EVENT_CODE is configured; production must not use test events')

if (process.argv.includes('--remote')) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !secret) {
    console.log('REMOTE skipped: Supabase environment missing')
    failed = true
  } else {
    const checks = {
      orders: 'id,tracking,tracking_outbox_status,meta_purchase_sent_at,fbp,fbc,utm_source,utm_campaign',
      tracking_outbox: 'id,order_id,owner_hash,event_name,event_id,payload,delivery,attempts,next_attempt_at,status',
      tracking_consent: 'owner_hash,analytics,marketing,version',
      ad_spend: 'id,day,source,campaign,amount,platform_revenue',
      products: 'id,slug,price,barcode,deleted_at',
    }
    for (const [table, columns] of Object.entries(checks)) {
      try {
        const response = await fetch(`${base}/rest/v1/${table}?select=${columns}&limit=0`, {
          headers: { apikey: secret, Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(12000),
        })
        console.log(`${response.ok ? 'OK' : 'FAIL'} REMOTE ${table} schema HTTP ${response.status}`)
        if (!response.ok) {
          failed = true
          if (table === 'orders' && response.status === 400) {
            for (const column of ['tracking', 'tracking_outbox_status', 'meta_purchase_sent_at', 'fbp', 'fbc', 'utm_source', 'utm_campaign']) {
              const field = await fetch(`${base}/rest/v1/orders?select=${column}&limit=0`, {
                headers: { apikey: secret, Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(12000),
              })
              console.log(`${field.ok ? 'OK' : 'MISSING'} REMOTE orders.${column}`)
            }
          }
        }
      } catch {
        console.log(`FAIL REMOTE ${table}: network unavailable`)
        failed = true
      }
    }
    // Published container source is public; this check sends no analytics events.
    const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim() || 'GTM-57BVM8H7'
    if (/^GTM-[A-Z0-9]+$/.test(gtmId)) {
      try {
        const response = await fetch(`https://www.googletagmanager.com/gtm.js?id=${gtmId}`, { signal: AbortSignal.timeout(12000) })
        const script = await response.text()
        const tags = script.match(/"tags"\s*:\s*\[\s*\]/)
        console.log(`REMOTE GTM HTTP ${response.status}; empty tag list: ${Boolean(tags)}; Meta signature: ${/facebook|fbevents|fbq/i.test(script)}; GA4 identifier: ${/G-[A-Z0-9]+/.test(script)}; Ads identifier: ${/AW-[0-9]+/.test(script)}`)
      } catch { console.log('REMOTE GTM source unavailable') }
    }
  }
}
process.exitCode = failed ? 1 : 0
