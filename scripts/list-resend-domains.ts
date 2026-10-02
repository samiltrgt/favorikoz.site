import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error('RESEND_API_KEY eksik (.env.local)')
    process.exit(1)
  }

  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${key}` },
  })
  const body = await res.json()
  console.log('HTTP', res.status)
  console.log(JSON.stringify(body, null, 2))

  if (res.status === 401 && body?.name === 'restricted_api_key') {
    console.error(`
Bu API anahtarı yalnızca e-posta göndermeye yetkili (send-only).
Domain listesi / DNS doğrulama için Resend dashboard'dan
tam yetkili bir API key oluşturup RESEND_API_KEY'i güncelleyin.
Sipariş onay mailleri (src/lib/order-email.ts) send-only key ile çalışmaya devam eder.
`)
    process.exit(1)
  }
}

main()
