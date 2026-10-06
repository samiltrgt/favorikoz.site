import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import utils from 'iyzipay/lib/utils.js'
import { pathToFileURL } from 'node:url'
import { createHmac } from 'node:crypto'

const COLUMNS = 'id,order_number,status,payment_status,payment_method,total,iyzico_basket_id,payment_token,updated_at'

export function parseArgs(args) {
  const options = { apply: false, allow: [] }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') options.apply = true
    else if (args[i] === '--allow') {
      const match = /^(ORD-[A-Za-z0-9-]+):(\d+)$/.exec(args[++i] || '')
      if (!match) throw new Error('--allow requires ORDER_NUMBER:PAYMENT_ID')
      if (options.allow.some(x => x.orderNumber === match[1] || x.paymentId === match[2])) {
        throw new Error('Duplicate order or payment in allowlist')
      }
      options.allow.push({ orderNumber: match[1], paymentId: match[2] })
    } else throw new Error(`Unknown argument: ${args[i]}`)
  }
  if (!options.allow.length) throw new Error('Explicit --allow ORDER_NUMBER:PAYMENT_ID required (default is dry-run)')
  return options
}

// No rounding tolerance: the persisted order total is integer kuruş.
export function toKurus(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const match = /^(\d+)(?:\.(\d{1,2})0*)?$/.exec(String(value))
  if (!match) return null
  const amount = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'))
  return Number.isSafeInteger(amount) ? amount : null
}

export function verifyPayment(order, paymentId, retrieved, reporting) {
  if (order.payment_status === 'completed') return 'already_completed'
  if (order.payment_status === 'refunded') return 'already_refunded'
  if (order.payment_status !== 'failed' || order.payment_method !== 'iyzico') return 'ineligible_order'
  if (!Number.isSafeInteger(order.total) || order.total <= 0 || !order.iyzico_basket_id || !order.payment_token) return 'invalid_order'
  if (retrieved?.status !== 'success' || retrieved.paymentStatus !== 'SUCCESS') return 'unconfirmed_payment'
  if (String(retrieved.paymentId) !== paymentId || retrieved.basketId !== order.iyzico_basket_id || retrieved.currency !== 'TRY' || toKurus(retrieved.paidPrice) !== order.total) return 'payment_mismatch'
  if (reporting?.status !== 'success' || !Array.isArray(reporting.payments) || reporting.payments.length !== 1) return 'unconfirmed_reporting'
  const payment = reporting.payments[0]
  // Reporting basketId is iyzico's internal basket ID, unlike /payment/detail's merchant basketId.
  if (String(payment.paymentId) !== paymentId || payment.paymentConversationId !== order.payment_token || payment.currency !== 'TRY' || toKurus(payment.paidPrice) !== order.total) return 'reporting_mismatch'
  if (payment.paymentRefundStatus === 'TOTALLY_REFUNDED') return 'verified_refunded'
  if (payment.paymentStatus !== 1 || payment.fraudStatus !== 1 || payment.paymentRefundStatus !== 'NOT_REFUNDED') return 'refund_or_fraud_review'
  if ((payment.cancels != null && !Array.isArray(payment.cancels)) || payment.cancels?.length || !Array.isArray(payment.itemTransactions) || !payment.itemTransactions.length) return 'refund_or_fraud_review'
  if (payment.itemTransactions.some(item => ![1, 2].includes(item.transactionStatus) || (item.refunds != null && !Array.isArray(item.refunds)) || item.refunds?.length)) return 'refund_or_fraud_review'
  return 'verified'
}

export async function compareAndSetPayment(supabase, order, targetPaymentStatus = 'completed') {
  // Never touch fulfillment status. Also protect against concurrent edits/refunds.
  if (!['completed', 'refunded'].includes(targetPaymentStatus)) throw new Error('Unexpected database reconciliation target')
  let query = supabase.from('orders').update({ payment_status: targetPaymentStatus })
  for (const field of ['id', 'order_number', 'status', 'payment_status', 'payment_method', 'total', 'iyzico_basket_id', 'payment_token', 'updated_at']) {
    query = order[field] == null ? query.is(field, null) : query.eq(field, order[field])
  }
  const { data, error } = await query.select(COLUMNS)
  if (error) throw new Error('Database reconciliation update failed')
  if (!data?.length) return 'concurrent_change'
  if (data.length !== 1 || data[0].payment_status !== targetPaymentStatus || data[0].status !== order.status) throw new Error('Unexpected database reconciliation result')
  return 'updated'
}

export async function reconcileOrders(options, dependencies) {
  const reports = []
  for (const entry of options.allow) {
    const { data: order, error } = await dependencies.supabase.from('orders').select(COLUMNS).eq('order_number', entry.orderNumber).maybeSingle()
    if (error) throw new Error('Database reconciliation read failed')
    if (!order) { reports.push({ ...entry, result: 'order_not_found' }); continue }
    // Each execution, including --apply, obtains fresh provider evidence.
    const retrieved = await dependencies.retrieve(entry.paymentId)
    const reporting = await dependencies.report(entry.paymentId)
    const verification = verifyPayment(order, entry.paymentId, retrieved, reporting)
    const targetPaymentStatus = verification === 'verified' ? 'completed' : verification === 'verified_refunded' ? 'refunded' : null
    const result = targetPaymentStatus
      ? options.apply ? await compareAndSetPayment(dependencies.supabase, order, targetPaymentStatus) : 'would_update'
      : verification
    const provider = reporting?.payments?.[0]
    const refundTotalTL = [...(provider?.cancels || []), ...(provider?.itemTransactions || []).flatMap(item => item.refunds || [])].filter(refund => refund.refundStatus === 1).reduce((sum, refund) => sum + (toKurus(refund.refundPrice) || 0), 0) / 100
    reports.push({ ...entry, amountTL: order.total / 100, preservedStatus: order.status, previousPaymentStatus: order.payment_status, targetPaymentStatus, providerRefundStatus: provider?.paymentRefundStatus, refundTotalTL, result, fulfillmentReview: order.status === 'cancelled' && targetPaymentStatus !== 'refunded' })
  }
  return reports
}

export async function providerRequest({ apiKey, secretKey, baseUrl }, path, body, method = 'POST', fetchImpl = fetch) {
  const randomString = utils.generateRandomString(8)
  // Reporting GET has no serialized body; official PHP SDK signs rnd + path only.
  const signature = createHmac('sha256', secretKey).update(randomString + path + (method === 'GET' ? '' : JSON.stringify(body))).digest('hex')
  const authorization = `IYZWSv2 ${Buffer.from(`apiKey:${apiKey}&randomKey:${randomString}&signature:${signature}`).toString('base64')}`
  const query = method === 'GET' ? `?${new URLSearchParams(body)}` : ''
  const response = await fetchImpl(`${baseUrl}${path}${query}`, {
    method,
    headers: { Authorization: authorization, 'Content-Type': 'application/json', 'x-iyzi-rnd': randomString },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`Provider reconciliation request failed (${response.status})`)
  return response.json()
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  dotenv.config({ path: '.env.local', quiet: true })
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'IYZICO_API_KEY', 'IYZICO_SECRET_KEY', 'IYZICO_BASE_URL']) {
    if (!process.env[key]?.trim()) throw new Error(`Missing ${key}`)
  }
  const credentials = { apiKey: process.env.IYZICO_API_KEY.trim(), secretKey: process.env.IYZICO_SECRET_KEY.trim(), baseUrl: process.env.IYZICO_BASE_URL.trim().replace(/\/+$/, '') }
  if (!['https://api.iyzipay.com', 'https://sandbox-api.iyzipay.com'].includes(credentials.baseUrl)) throw new Error('Unsupported iyzico endpoint')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false, autoRefreshToken: false } })
  const reports = await reconcileOrders(options, {
    supabase,
    retrieve: paymentId => providerRequest(credentials, '/payment/detail', { locale: 'tr', paymentId }),
    report: paymentId => providerRequest(credentials, '/v2/reporting/payment/details', { locale: 'tr', paymentId }, 'GET'),
  })
  console.log(JSON.stringify({ mode: options.apply ? 'apply' : 'dry-run', reports }, null, 2))
  if (reports.some(report => !['updated', 'would_update', 'already_completed', 'already_refunded'].includes(report.result))) process.exitCode = 2
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    const safeMessage = /^(Missing |Unsupported iyzico|Provider reconciliation|Database reconciliation|Unexpected database|Explicit |Unknown argument|Duplicate |--allow)/.test(error.message) ? error.message : 'Provider/database connection failed'
    console.error(`Reconciliation stopped: ${safeMessage}; no automatic retry.`)
    process.exitCode = 1
  })
}
