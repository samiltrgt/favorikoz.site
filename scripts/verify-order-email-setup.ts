import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

async function main() {
  const key = process.env.RESEND_API_KEY
  const from = process.env.ORDER_FROM_EMAIL || 'Favori Kozmetik <onboarding@resend.dev>'

  console.log('RESEND_API_KEY:', key ? 'OK' : 'EKSIK')
  console.log('ORDER_FROM_EMAIL:', from)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error: colErr } = await supabase.from('orders').select('confirmation_email_sent_at').limit(1)
  console.log('Supabase confirmation_email_sent_at:', colErr ? `EKSIK (${colErr.message})` : 'OK')

  if (!key) return

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: ['mervesaat@gmail.com'],
      subject: 'Favori Kozmetik — domain testi',
      html: '<p>Domain doğrulaması sonrası müşteri sipariş mailleri bu adresten gidecek.</p>',
    }),
  })

  console.log('Resend müşteri mail testi HTTP:', res.status)
  const body = await res.text()
  console.log(body.slice(0, 400))

  if (res.status === 200) {
    console.log('\n✅ Müşteri adresine mail gönderimi çalışıyor.')
  } else if (res.status === 403) {
    console.log('\n⚠️  Domain henüz doğrulanmamış veya FROM adresi domain ile uyuşmuyor.')
    for (const domainFrom of [
      'Favori Kozmetik <siparis@favorikozmetik.com>',
      'Favori Kozmetik <noreply@favorikozmetik.com>',
    ]) {
      const r2 = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: domainFrom,
          to: ['mervesaat@gmail.com'],
          subject: 'Domain test',
          html: '<p>test</p>',
        }),
      })
      console.log('  Deneme', domainFrom, '→', r2.status, (await r2.text()).slice(0, 100))
    }
  }
}

main().catch(console.error)
