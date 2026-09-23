import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const key = process.env.RESEND_API_KEY
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${key}` },
  })
  console.log('HTTP', res.status)
  console.log(JSON.stringify(await res.json(), null, 2))
}

main()
