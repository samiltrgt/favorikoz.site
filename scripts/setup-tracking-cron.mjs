import dotenv from 'dotenv'
import { readFile } from 'node:fs/promises'
dotenv.config({ path: '.env.local', quiet: true })

// Creates Vault secrets + schedules minute pg_cron job. Never prints secret values.
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const cronSecret = process.env.CRON_SECRET?.trim()
const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://favorikozmetik.com').replace(/\/$/, '')
const cronUrl = `${baseUrl.replace('://www.', '://')}/api/cron/tracking`
let project
try {
  project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1]
} catch { /* handled below */ }

if (!token || !project || !cronSecret) {
  console.error('Need SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL, and CRON_SECRET in .env.local')
  console.error('Create a personal access token at https://supabase.com/dashboard/account/tokens')
  console.error('Then either re-run this script, or in SQL Editor run:')
  console.error(`  select vault.create_secret('${cronUrl}', 'tracking_cron_url');`)
  console.error("  select vault.create_secret('<CRON_SECRET from .env.local>', 'tracking_cron_secret');")
  console.error('  -- then run supabase-tracking-cron.sql')
  process.exit(1)
}

async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(60000),
  })
  if (!response.ok) {
    console.error(`SQL HTTP ${response.status}`)
    process.exit(1)
  }
}

const existing = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `select name from vault.decrypted_secrets where name in ('tracking_cron_url','tracking_cron_secret')`,
  }),
  signal: AbortSignal.timeout(30000),
}).then(r => r.ok ? r.json() : null).catch(() => null)

const names = new Set((Array.isArray(existing) ? existing : existing?.data || []).map(row => row.name))
if (!names.has('tracking_cron_url')) {
  await query(`select vault.create_secret('${cronUrl.replace(/'/g, "''")}', 'tracking_cron_url')`)
  console.log('CREATED vault tracking_cron_url')
} else {
  console.log('OK vault tracking_cron_url exists')
}
if (!names.has('tracking_cron_secret')) {
  await query(`select vault.create_secret('${cronSecret.replace(/'/g, "''")}', 'tracking_cron_secret')`)
  console.log('CREATED vault tracking_cron_secret')
} else {
  console.log('OK vault tracking_cron_secret exists')
}

const cronSql = await readFile(new URL('../supabase-tracking-cron.sql', import.meta.url), 'utf8')
await query(cronSql)
console.log('APPLIED supabase-tracking-cron.sql')
console.log(`Cron target: ${cronUrl}`)
