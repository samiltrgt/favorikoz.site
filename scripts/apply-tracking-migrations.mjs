import dotenv from 'dotenv'
import { readFile } from 'node:fs/promises'
dotenv.config({ path: '.env.local', quiet: true })

const files = ['orders-analytics-tracking-migration.sql', 'tracking-measurement-v4.sql', 'supabase-ad-spend.sql']
if (process.argv.includes('--with-cron')) files.push('supabase-tracking-cron.sql')
if (!process.argv.includes('--apply')) {
  console.log('Prepared migrations (in order):')
  files.forEach(file => console.log(file))
  console.log('Use --apply only after configuring SUPABASE_ACCESS_TOKEN in .env.local. SQL Editor is also supported.')
  process.exit(0)
}
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
let project
try { project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1] } catch { /* Handled below. */ }
if (!token || !project) {
  console.error('Missing Supabase management access token or valid project URL. Service-role JWT does not grant SQL migration access.')
  process.exit(1)
}
for (const file of files) {
  try {
    const query = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }), signal: AbortSignal.timeout(60000),
    })
    if (!response.ok) { console.error(`FAIL ${file}: HTTP ${response.status}. Inspect Supabase SQL Editor for diagnostics.`); process.exit(1) }
    console.log(`APPLIED ${file}`)
  } catch { console.error(`FAIL ${file}: migration request failed. No credentials or response bodies printed.`); process.exit(1) }
}
