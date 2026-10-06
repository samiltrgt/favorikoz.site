import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

// Isolated, in-memory PostgreSQL. No Supabase keys, real customer data or network.
const db = new PGlite()
try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE TYPE public.order_status AS ENUM ('pending','paid','shipped','completed','cancelled');
    CREATE TYPE public.payment_status AS ENUM ('pending','completed','failed');
    CREATE TABLE public.orders (
      id uuid primary key default gen_random_uuid(), order_number text unique not null,
      user_id uuid, customer_name text not null, customer_email text not null,
      customer_phone text, shipping_address jsonb not null, billing_address jsonb,
      items jsonb not null, subtotal bigint not null, shipping_cost bigint not null,
      total bigint not null, discount_amount bigint default 0,
      status public.order_status not null default 'pending', payment_method text not null,
      payment_status public.payment_status not null default 'pending', payment_token text,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    GRANT ALL ON public.orders TO anon, authenticated, service_role;
  `)
  const migrations = ['orders-analytics-tracking-migration.sql', 'tracking-measurement-v4.sql', 'supabase-ad-spend.sql', 'supabase/migrations/20261006191153_tracking_orders_least_privilege.sql']
  for (let pass = 1; pass <= 2; pass++) {
    for (const file of migrations) {
      const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
      await db.exec(source)
      console.log(`PASS migration ${file} (${pass === 1 ? 'initial' : 'idempotent rerun'})`)
    }
  }
  await db.exec(await readFile(new URL('./tracking-measurement-regression.sql', import.meta.url), 'utf8'))
  console.log('PASS PostgreSQL payment/lease/consent regression (isolated fixtures rolled back)')
} catch (error) {
  console.error('FAIL isolated PostgreSQL regression:', error instanceof Error ? error.message : 'unknown database error')
  process.exitCode = 1
} finally { await db.close() }
