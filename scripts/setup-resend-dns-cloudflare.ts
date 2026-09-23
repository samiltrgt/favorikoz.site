/**
 * Resend domain DNS kayıtlarını Cloudflare'e ekler.
 * .env.local: RESEND_API_KEY, CLOUDFLARE_API_TOKEN
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DOMAIN = process.env.CF_DOMAIN || 'favorikozmetik.com'
const CF = 'https://api.cloudflare.com/client/v4'

async function cf(path: string, options: RequestInit = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN eksik')
  const res = await fetch(`${CF}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.errors?.map((e: { message: string }) => e.message).join('; ') || res.statusText)
  }
  return json.result
}

async function main() {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) throw new Error('RESEND_API_KEY eksik')

  const listRes = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${resendKey}` },
  })
  const listBody = await listRes.json()
  console.log('Resend domains HTTP:', listRes.status)

  const domains = listBody.data || listBody || []
  const domain = Array.isArray(domains)
    ? domains.find((d: { name?: string }) => d.name === DOMAIN)
    : null

  if (!domain?.id) {
    console.log('Domain Resend\'de bulunamadı, oluşturuluyor...')
    const createRes = await fetch('https://api.resend.com/domains', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: DOMAIN }),
    })
    const created = await createRes.json()
    console.log('Create:', createRes.status, JSON.stringify(created).slice(0, 500))
    if (!createRes.ok) process.exit(1)
    domain.id = created.id
    domain.records = created.records
  }

  const detailRes = await fetch(`https://api.resend.com/domains/${domain.id}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  })
  const detail = await detailRes.json()
  console.log('Domain status:', detail.status || detail)

  const records = detail.records || domain.records || []
  if (!records.length) {
    console.log('DNS kaydı bulunamadı:', JSON.stringify(detail).slice(0, 800))
    return
  }

  const zones = await cf(`/zones?name=${DOMAIN}`)
  const zoneId = zones[0]?.id
  if (!zoneId) throw new Error(`Cloudflare zone yok: ${DOMAIN}`)

  const existing = await cf(`/zones/${zoneId}/dns_records?per_page=100`)

  for (const rec of records) {
    const name = rec.name === DOMAIN || rec.name === '@' ? DOMAIN : `${rec.name}.${DOMAIN}`.replace(`.${DOMAIN}.${DOMAIN}`, `.${DOMAIN}`)
    const cfName = rec.name === '@' || rec.name === DOMAIN ? DOMAIN : `${rec.name}.${DOMAIN}`

    const type = rec.type?.toUpperCase() || 'TXT'
    const content = rec.value || rec.content
    if (!content) continue

    const dup = existing.find(
      (r: { type: string; name: string; content: string }) =>
        r.type === type && r.name === cfName && r.content.replace(/"/g, '') === String(content).replace(/"/g, '')
    )
    if (dup) {
      console.log('Zaten var:', type, cfName)
      continue
    }

    const payload: Record<string, unknown> = {
      type,
      name: rec.name === '@' ? DOMAIN : cfName,
      content,
      ttl: 3600,
    }
    if (type === 'MX') payload.priority = rec.priority ?? 10

    await cf(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    console.log('Eklendi:', type, payload.name)
  }

  console.log('\nDNS eklendi. Resend domain doğrulaması birkaç dakika sürebilir.')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
