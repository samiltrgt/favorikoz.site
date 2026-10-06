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
    CREATE TYPE public.payment_status AS ENUM ('pending','completed','failed','refunded');
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
  for (const file of ['orders-analytics-tracking-migration.sql', 'tracking-measurement-v4.sql', 'orders-iyzico-basket-id-migration.sql', 'payment-reconciliation.sql']) {
    await db.exec(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'))
  }
  await db.exec(await readFile(new URL('../payment-reconciliation.sql', import.meta.url), 'utf8'))
  const insert = async (number, status = 'pending', payment = 'pending') => {
    const { rows } = await db.query(`INSERT INTO public.orders(order_number,customer_name,customer_email,shipping_address,items,subtotal,shipping_cost,total,payment_method,status,payment_status,payment_token,iyzico_basket_id,tracking)
      VALUES ($1,'Fixture','fixture@example.invalid','{}','[]',10000,0,10000,'credit_card',$2,$3,$1,$1,'{"consent":{"analytics":true,"marketing":false}}') RETURNING id`, [number,status,payment])
    return rows[0].id
  }
  const reconcile = async (id, payment, basket, total=10000) => (await db.query('SELECT * FROM reconcile_verified_payment($1,$2,$3,$4)',[id,payment,basket,total])).rows
  const assert = (condition, label) => { if (!condition) throw new Error(label); console.log(`PASS ${label}`) }
  const pending = await insert('pending')
  assert((await reconcile(pending,'101','pending'))[0].status === 'paid','active pending becomes paid')
  assert((await reconcile(pending,'101','pending'))[0].status === 'paid','duplicate notification preserves paid')
  assert((await db.query("SELECT count(*)::int count FROM tracking_outbox WHERE order_id=$1",[pending])).rows[0].count === 1,'purchase queued exactly once')
  const shipped = await insert('shipped','shipped','failed')
  assert((await reconcile(shipped,'102','shipped'))[0].status === 'shipped','financial failed repair preserves shipped')
  const cancelled = await insert('cancelled','cancelled','failed')
  assert((await reconcile(cancelled,'103','cancelled'))[0].status === 'cancelled','financial repair preserves cancellation')
  assert((await db.query('SELECT count(*)::int count FROM tracking_outbox WHERE order_id=$1',[cancelled])).rows[0].count === 0,'cancelled purchase suppressed')
  const refunded = await insert('refunded','cancelled','refunded')
  assert((await reconcile(refunded,'104','refunded')).length === 0,'refunded payment never restored')
  assert((await reconcile(shipped,'102','wrong')).length === 0,'basket mismatch refused')
  assert((await reconcile(shipped,'102','shipped',1)).length === 0,'amount mismatch refused')
  assert((await reconcile(shipped,'999','shipped')).length === 0,'stable payment ID cannot change')
  const other = await insert('other')
  let duplicateDenied = false
  try { await reconcile(other,'102','other') } catch { duplicateDenied = true }
  assert(duplicateDenied,'one payment cannot settle two orders')
  const permissions = (await db.query("SELECT has_function_privilege('anon','reconcile_verified_payment(uuid,text,text,bigint)','EXECUTE') anon, has_function_privilege('authenticated','claim_payment_checks(integer)','EXECUTE') authenticated, has_function_privilege('service_role','claim_payment_checks(integer)','EXECUTE') service")).rows[0]
  assert(!permissions.anon && !permissions.authenticated && permissions.service,'RPCs restricted to service role')
  const claimed = (await db.query('SELECT * FROM claim_payment_checks(100)')).rows
  assert(claimed.length <= 5 && claimed.every(x=>x.payment_check_attempts === 1),'bounded claims increment attempts')
  assert((await db.query('SELECT * FROM claim_payment_checks(5)')).rows.length === 0,'leased checks cannot overlap')
} catch (error) {
  console.error('FAIL payment PostgreSQL regression:', error instanceof Error ? error.message : 'unknown')
  process.exitCode = 1
} finally { await db.close() }
