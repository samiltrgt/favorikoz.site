/**
 * Supabase orders tablosuna confirmation_email_sent_at ekler.
 * .env.local: SUPABASE_DB_URL (Dashboard → Settings → Database → Connection string → URI)
 * Örnek: postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL veya DATABASE_URL .env.local içinde yok.')
    console.error('Supabase Dashboard → Project Settings → Database → Connection string (URI) kopyalayın.')
    process.exit(1)
  }

  const { default: postgres } = await import('postgres')
  const sql = postgres(dbUrl, { max: 1 })

  try {
    await sql`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz
    `
    console.log('✅ confirmation_email_sent_at sütunu eklendi (veya zaten vardı)')
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
