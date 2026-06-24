#!/usr/bin/env node
/**
 * Cloudflare DNS + SSL düzeltmesi (Vercel + proxied Cloudflare).
 *
 * Gerekli .env.local:
 *   CLOUDFLARE_API_TOKEN=...  (Zone:DNS:Edit + Zone:SSL:Edit)
 *
 * Kullanım: npm run fix:cloudflare-dns
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DOMAIN = process.env.CF_DOMAIN || 'favorikozmetik.com'
const VERCEL_CNAME = process.env.VERCEL_CNAME || 'b9ff16f0fd70db17.vercel-dns-017.com'
const TOKEN = process.env.CLOUDFLARE_API_TOKEN

const CF = 'https://api.cloudflare.com/client/v4'

async function cf(path, options = {}) {
  const res = await fetch(`${CF}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const json = await res.json()
  if (!json.success) {
    const msg = json.errors?.map((e) => e.message).join('; ') || res.statusText
    throw new Error(msg)
  }
  return json.result
}

async function main() {
  if (!TOKEN) {
    console.error('CLOUDFLARE_API_TOKEN eksik (.env.local)')
    process.exit(1)
  }

  const zones = await cf(`/zones?name=${DOMAIN}`)
  const zone = zones[0]
  if (!zone) throw new Error(`Zone bulunamadı: ${DOMAIN}`)
  const zoneId = zone.id
  console.log(`Zone: ${zone.name} (${zoneId})`)

  const ssl = await cf(`/zones/${zoneId}/settings/ssl`)
  console.log(`SSL (önce): ${ssl.value}`)
  if (ssl.value !== 'strict') {
    await cf(`/zones/${zoneId}/settings/ssl`, {
      method: 'PATCH',
      body: JSON.stringify({ value: 'strict' }),
    })
    console.log('SSL → strict')
  }

  const alwaysHttps = await cf(`/zones/${zoneId}/settings/always_use_https`)
  if (alwaysHttps.value !== 'on') {
    await cf(`/zones/${zoneId}/settings/always_use_https`, {
      method: 'PATCH',
      body: JSON.stringify({ value: 'on' }),
    })
    console.log('Always Use HTTPS → on')
  }

  const records = await cf(`/zones/${zoneId}/dns_records?per_page=100`)
  const byName = (name) =>
    records.filter((r) => r.name === name || r.name === `${DOMAIN}` || r.name === `www.${DOMAIN}`)

  const targets = [
    { name: DOMAIN, label: '@' },
    { name: `www.${DOMAIN}`, label: 'www' },
  ]

  for (const { name, label } of targets) {
    const existing = records.filter((r) => r.name === name && (r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME'))
    const desired = {
      type: 'CNAME',
      name: label === '@' ? DOMAIN : name,
      content: VERCEL_CNAME,
      proxied: true,
      ttl: 1,
    }

    const cname = existing.find((r) => r.type === 'CNAME')
    if (cname) {
      if (cname.content.replace(/\.$/, '') !== VERCEL_CNAME.replace(/\.$/, '') || !cname.proxied) {
        await cf(`/zones/${zoneId}/dns_records/${cname.id}`, {
          method: 'PATCH',
          body: JSON.stringify(desired),
        })
        console.log(`Güncellendi: ${label} → ${VERCEL_CNAME} (proxied)`)
      } else {
        console.log(`OK: ${label} zaten doğru`)
      }
      for (const extra of existing.filter((r) => r.id !== cname.id && (r.type === 'A' || r.type === 'AAAA'))) {
        await cf(`/zones/${zoneId}/dns_records/${extra.id}`, { method: 'DELETE' })
        console.log(`Silindi: ${extra.type} ${extra.name}`)
      }
    } else {
      for (const extra of existing) {
        await cf(`/zones/${zoneId}/dns_records/${extra.id}`, { method: 'DELETE' })
        console.log(`Silindi: ${extra.type} ${extra.name}`)
      }
      await cf(`/zones/${zoneId}/dns_records`, {
        method: 'POST',
        body: JSON.stringify(desired),
      })
      console.log(`Eklendi: ${label} → ${VERCEL_CNAME} (proxied)`)
    }
  }

  console.log('\nTamamlandı. 5-10 dk sonra https://' + DOMAIN + ' test edin.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
