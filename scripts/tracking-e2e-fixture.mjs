import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const root = new URL('../', import.meta.url)
const productId = '11111111-1111-4111-8111-111111111111'
const orderColumns = new Set(`id order_number user_id customer_name customer_email customer_phone shipping_address billing_address items subtotal shipping_cost total discount_amount status payment_method payment_status payment_token created_at updated_at fbp fbc fbclid gclid gbraid wbraid utm_source utm_medium utm_campaign utm_content utm_term client_ip client_user_agent meta_purchase_sent_at tracking tracking_outbox_status iyzico_basket_id coupon_code confirmation_email_sent_at`.split(' '))
const tableColumns = {
  orders: orderColumns,
  tracking_consent: new Set(['owner_hash', 'analytics', 'marketing', 'version', 'updated_at']),
  tracking_outbox: new Set(['id', 'order_id', 'owner_hash', 'event_name', 'event_id', 'event_time', 'payload', 'delivery', 'attempts', 'next_attempt_at', 'status', 'lease_token', 'lease_until', 'last_error', 'created_at', 'sent_at']),
}
const rpcArgs = {
  update_tracking_consent: ['p_owner_hash', 'p_version', 'p_analytics', 'p_marketing'],
  enqueue_tracking_browser: ['p_owner_hash', 'p_version', 'p_consent', 'p_event'],
  claim_tracking_outbox: ['p_limit', 'p_order_number'],
  finish_tracking_outbox: ['p_id', 'p_lease_token', 'p_status', 'p_delivery', 'p_error', 'p_retry_seconds'],
  confirm_tracking_payment: ['p_payment_token', 'p_order_number'],
}

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS,HEAD' })
  res.end(JSON.stringify(value))
}

async function bodyJson(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return body ? JSON.parse(body) : {}
}

function filters(url, allowed, values) {
  const clauses = []
  for (const [key, raw] of url.searchParams) {
    if (!['select', 'order', 'limit', 'offset'].includes(key) && !key.startsWith('or')) {
      if (!allowed.has(key)) throw new Error('unsupported column')
      const dot = raw.indexOf('.')
      const op = raw.slice(0, dot)
      if (dot < 0 || !['eq', 'neq', 'ilike', 'is'].includes(op)) throw new Error('unsupported filter')
      values.push(raw.slice(dot + 1))
      clauses.push(`"${key}" ${op === 'eq' ? '=' : op === 'neq' ? '<>' : op === 'ilike' ? 'ILIKE' : 'IS'} $${values.length}`)
    }
  }
  return clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''
}

export async function createTrackingFixture() {
  const db = new PGlite()
  const meta = [], google = [], iyzico = []
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TYPE public.order_status AS ENUM ('pending','paid','shipped','completed','cancelled');
    CREATE TYPE public.payment_status AS ENUM ('pending','completed','failed');
    CREATE TABLE public.orders (
      id uuid primary key default gen_random_uuid(), order_number text unique not null,
      user_id uuid, customer_name text not null, customer_email text not null, customer_phone text,
      shipping_address jsonb not null, billing_address jsonb, items jsonb not null,
      subtotal bigint not null, shipping_cost bigint not null, total bigint not null,
      discount_amount bigint default 0, status public.order_status not null default 'pending',
      payment_method text not null, payment_status public.payment_status not null default 'pending',
      payment_token text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      iyzico_basket_id text, coupon_code text, confirmation_email_sent_at timestamptz
    );
    GRANT ALL ON public.orders TO anon, authenticated, service_role;
  `)
  for (const name of ['orders-analytics-tracking-migration.sql', 'tracking-measurement-v4.sql']) {
    await db.exec(await readFile(new URL(name, root), 'utf8'))
  }
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      if (req.method === 'OPTIONS') return json(res, 204, {})
      if (url.pathname === '/collect/meta' && req.method === 'POST') { meta.push(await bodyJson(req)); return json(res, 200, { events_received: 1 }) }
      if (url.pathname === '/collect/google' && req.method === 'POST') { google.push(await bodyJson(req)); res.writeHead(204, { 'access-control-allow-origin': '*' }); return res.end() }
      if (url.pathname === '/payment/3dsecure/auth' && req.method === 'POST') {
        const input = await bodyJson(req)
        const result = { status: 'success', paymentStatus: 'SUCCESS', conversationId: input.conversationId, basketId: input.basketId || 'tracking-e2e-basket', currency: 'TRY', paidPrice: '100.00', paymentId: 'fixture-payment' }
        iyzico.push({ request: input, response: result }); return json(res, 200, result)
      }
      if (url.pathname === '/payment/v2/3dsecure/auth' && req.method === 'POST') {
        const input = await bodyJson(req)
        const result = { status: 'success', paymentStatus: 'SUCCESS', conversationId: input.conversationId, basketId: input.basketId || 'tracking-e2e-basket', currency: 'TRY', paidPrice: '100.00', paymentId: 'fixture-payment' }
        iyzico.push({ request: input, response: result }); return json(res, 200, result)
      }
      if (url.pathname === '/rest/v1/products' && req.method === 'GET') {
        const start = Number((req.headers.range || '0-').split('-')[0]) || 0
        return json(res, 200, start === 0 ? [{ id: productId, slug: 'tracking-e2e-product', name: 'Test Kozmetik', price: 10000, brand: 'Test', image: '/logo.png', images: ['/logo.png'], in_stock: true, stock_quantity: 10, barcode: null, category: null, categories: null, deleted_at: null }] : [])
      }
      if (url.pathname.startsWith('/rest/v1/') && ['categories', 'profiles', 'product_categories', 'reviews', 'product_reviews'].includes(url.pathname.split('/').pop())) return json(res, 200, [])
      const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)
      if (rpc && req.method === 'POST') {
        const args = await bodyJson(req), names = rpcArgs[rpc[1]]
        if (!names) return json(res, 404, { message: 'RPC not found' })
        const result = await db.query(`SELECT * FROM public.${rpc[1]}(${names.map((_, i) => `$${i + 1}`).join(',')})`, names.map((n) => args[n] ?? null))
        if (['update_tracking_consent', 'enqueue_tracking_browser'].includes(rpc[1])) return json(res, 200, result.rows[0]?.[rpc[1]] ?? false)
        if (rpc[1] === 'finish_tracking_outbox') return json(res, 200, null)
        return json(res, 200, result.rows)
      }
      const table = url.pathname.match(/^\/rest\/v1\/(orders|tracking_consent|tracking_outbox)$/)?.[1]
      if (table && ['GET', 'PATCH'].includes(req.method)) {
        const allowed = tableColumns[table], values = []
        const where = filters(url, allowed, values)
        if (req.method === 'GET') {
          const requested = (url.searchParams.get('select') || '*').split(',').map(x => x.trim())
          const columns = requested.includes('*') ? '*' : requested.map(c => { if (!allowed.has(c)) throw new Error('unsupported select'); return `"${c}"` }).join(',')
          const limit = Math.min(500, Math.max(0, Number(url.searchParams.get('limit') || 500)))
          const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))
          const result = await db.query(`SELECT ${columns} FROM public.${table}${where} LIMIT ${limit} OFFSET ${offset}`, values)
          const single = req.headers.accept?.includes('vnd.pgrst.object+json')
          return json(res, 200, single ? (result.rows[0] ?? null) : result.rows)
        }
        const update = await bodyJson(req), entries = Object.entries(update)
        if (!entries.length || entries.some(([k]) => !allowed.has(k))) return json(res, 400, { message: 'unsupported update' })
        const set = entries.map(([k, v]) => { values.push(v); return `"${k}"=$${values.length}` }).join(',')
        const result = await db.query(`UPDATE public.${table} SET ${set}${where} RETURNING *`, values)
        const single = req.headers.accept?.includes('vnd.pgrst.object+json')
        return json(res, 200, single ? (result.rows[0] ?? null) : result.rows)
      }
      return json(res, 404, { message: 'not found' })
    } catch (error) { return json(res, 400, { message: error instanceof Error ? error.message : 'fixture error' }) }
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const { port } = server.address()
  return { url: `http://127.0.0.1:${port}`, db, meta, google, iyzico, close: async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await db.close() } }
}
