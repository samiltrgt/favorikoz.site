import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
const db = new PGlite()
const assert = (ok, text) => { if (!ok) throw new Error(text); console.log(`PASS ${text}`) }
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text,raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false);
    CREATE TABLE public.orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_number text,customer_name text,customer_email text,
      items jsonb DEFAULT '[]',subtotal bigint DEFAULT 10000,shipping_cost bigint DEFAULT 0,total bigint DEFAULT 10000,
      shipping_address jsonb DEFAULT '{}',carrier text,tracking_number text,status text DEFAULT 'pending',payment_status text DEFAULT 'pending');
    INSERT INTO public.orders(order_number) VALUES('historical');
    INSERT INTO auth.users(email,email_confirmed_at) VALUES('old@example.invalid',now());`)
  await db.exec(await readFile(new URL('../supabase/migrations/20261009082113_transactional_email_notifications.sql',import.meta.url),'utf8'))
  const count = async kind => (await db.query('SELECT count(*)::int n FROM email_notifications WHERE kind=$1',[kind])).rows[0].n
  assert((await db.query('SELECT count(*)::int n FROM email_notifications')).rows[0].n === 0,'no historical backfill')
  const order = (await db.query("INSERT INTO orders(order_number,customer_name,customer_email) VALUES('new','Test','customer@example.invalid') RETURNING id")).rows[0].id
  assert(await count('order_confirmation')===0,'pending payments send no confirmation')
  await db.query("UPDATE orders SET status='paid',payment_status='completed' WHERE id=$1",[order])
  assert(await count('order_confirmation')===1 && await count('admin_order')===1,'payment queues customer and admin notifications')
  await db.query("UPDATE orders SET payment_status='completed' WHERE id=$1",[order])
  assert(await count('order_confirmation')===1,'duplicate payment callback does not duplicate email')
  await db.query("UPDATE orders SET status='shipped',carrier='Test Cargo',tracking_number='123' WHERE id=$1",[order])
  await db.query("UPDATE orders SET status='shipped',carrier='Test Cargo',tracking_number='123' WHERE id=$1",[order])
  assert(await count('shipping')===1,'same shipping save sends one notification')
  await db.query("UPDATE orders SET tracking_number='456' WHERE id=$1",[order])
  assert(await count('shipping')===2,'new tracking details queue an update')
  const user = (await db.query("INSERT INTO auth.users(email) VALUES('new@example.invalid') RETURNING id")).rows[0].id
  assert(await count('admin_signup')===1 && await count('welcome')===0,'signup notifies admin but waits for confirmation to welcome')
  await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[user])
  await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[user])
  assert(await count('welcome')===1,'email confirmation welcomes exactly once')
  await db.exec("INSERT INTO auth.users(email,is_anonymous) VALUES('anon@example.invalid',true)")
  assert(await count('admin_signup')===1,'anonymous accounts produce no customer notification')
  const claimed=(await db.query('SELECT * FROM claim_email_notifications(100)')).rows
  assert(claimed.length===4 && claimed.every(e=>e.attempts===1),'bounded batch and attempt counter')
  assert((await db.query('SELECT * FROM claim_email_notifications(4)')).rows.every(e=>!claimed.some(c=>c.id===e.id)),'concurrent workers cannot claim the same message')
  const e=claimed[0]
  assert((await db.query('SELECT finish_email_notification($1,$2,$3)',[e.id,e.lease_token,'provider-id'])).rows[0].finish_email_notification,'successful send records provider ID')
  assert(!(await db.query('SELECT finish_email_notification($1,$2,$3)',[e.id,e.lease_token,'provider-id'])).rows[0].finish_email_notification,'stale worker cannot settle twice')
  const retry=claimed[1]
  await db.query('SELECT finish_email_notification($1,$2,NULL,$3,true)',[retry.id,retry.lease_token,'timeout'])
  assert((await db.query('SELECT status FROM email_notifications WHERE id=$1',[retry.id])).rows[0].status==='pending','transient send failure remains retryable')
  await db.query("UPDATE email_notifications SET first_attempt_at=now()-interval '24 hours' WHERE id=$1",[retry.id])
  await db.exec('SELECT * FROM claim_email_notifications(4)')
  assert((await db.query('SELECT status FROM email_notifications WHERE id=$1',[retry.id])).rows[0].status==='failed','retries stop before provider idempotency expires')
  const permissions=(await db.query("SELECT has_table_privilege('anon','email_notifications','SELECT') a,has_function_privilege('authenticated','claim_email_notifications(integer,uuid)','EXECUTE') b,has_function_privilege('anon','queue_registration_email_notifications()','EXECUTE') c")).rows[0]
  assert(!permissions.a && !permissions.b && !permissions.c,'notification data and functions inaccessible to customers')
  await db.query("UPDATE orders SET status='cancelled',payment_status='refunded' WHERE id=$1",[order])
  assert(await count('order_confirmation')===1 && await count('shipping')===2,'cancellation and refund queue no customer success mail')
  await db.exec('ALTER TABLE email_notifications RENAME TO unavailable_email_notifications')
  const outageOrder=(await db.query("INSERT INTO orders(order_number) VALUES('outage') RETURNING id")).rows[0].id
  await db.query("UPDATE orders SET status='paid',payment_status='completed' WHERE id=$1",[outageOrder])
  assert((await db.query('SELECT status,payment_status FROM orders WHERE id=$1',[outageOrder])).rows[0].status==='paid','queue outage cannot break payment confirmation')
  const surviving=(await db.query("INSERT INTO auth.users(email) VALUES('surviving@example.invalid') RETURNING id")).rows
  assert(surviving.length===1,'queue outage cannot block registration')
} catch (err) { console.error('FAIL',err.message);process.exitCode=1 }
finally { await db.close() }
