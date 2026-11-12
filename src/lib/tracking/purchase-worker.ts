import 'server-only'
import { adItemsFromOrder, adValueFromOrder } from '@/lib/analytics/value'
import { assertPurchaseValue } from '@/lib/analytics/purchase-value'
import { getSiteUrl } from '@/lib/site-url'
import { buildMetaUserData, deliverMeta, type MetaEvent } from './meta'
import { deliverGooglePurchase } from './google'
import { getPredictedLtv } from './ltv'
import type { OutboxRow } from './outbox'

type Database = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>; from: (table: string) => any }
export type PurchaseResult = 'sent' | 'failed' | 'pending'

// Only explicit rejections/configuration errors are retryable. A timeout or a
// lost acknowledgement can mean the provider accepted the event already.
function retryable(error: unknown): boolean {
  const code = error instanceof Error ? error.message : ''
  return /^(meta|ga4)_(http_(429|5\d\d)|configuration_(missing|invalid))$/.test(code)
}

export async function deliverPurchaseRow(db: Database, row: OutboxRow, retrySeconds: number): Promise<PurchaseResult> {
  try {
    return await processPurchaseRow(db, row, retrySeconds)
  } catch (error) {
    if (error instanceof Error && error.message === 'purchase_database_unavailable') {
      // Safe only when SQL confirms that no HTTP reservation remains open.
      const finished = await db.rpc('finish_tracking_purchase', { p_id: row.id, p_lease_token: row.lease_token, p_retry_seconds: retrySeconds })
      if (!finished.error && (finished.data === 'sent' || finished.data === 'failed' || finished.data === 'pending')) return finished.data
    }
    throw error
  }
}

async function processPurchaseRow(db: Database, row: OutboxRow, retrySeconds: number): Promise<PurchaseResult> {
  const snapshot = { payload: row.payload, event_id: row.event_id, event_time: row.event_time, order_id: row.order_id }
  async function rpc(name: string, extra: Record<string, unknown> = {}): Promise<unknown> {
    const result = await db.rpc(name, { p_id: row.id, p_lease_token: row.lease_token, ...extra })
    if (result.error) throw new Error('purchase_database_unavailable')
    return result.data
  }
  // This check does not reserve a send. All construction/awaits precede the
  // final atomic per-channel authorization, including the LTV lookup.
  const inspected = await rpc('inspect_tracking_purchase', { p_payload: snapshot })
  if (inspected === 'quarantined') return 'failed'
  if (inspected !== 'valid') throw new Error('tracking_lease_lost')
  for (const platform of ['meta', 'ga4'] as const) {
    if (['sent', 'skipped', 'failed'].includes(row.delivery[platform])) continue
    const order = row.payload.order
    const tracking = row.payload.tracking || {}
    const value = adValueFromOrder(order)
    assertPurchaseValue(value) // SQL has already checked canonical integer kuruş.
    const contents = adItemsFromOrder(order)
    let event: MetaEvent | undefined
    if (platform === 'meta' && tracking.consent?.marketing === true) {
      event = { event_name: 'Purchase', event_id: row.event_id, event_time: row.event_time,
        action_source: 'website', event_source_url: tracking.source_url || `${getSiteUrl()}/checkout`,
        user_data: buildMetaUserData(tracking, order), custom_data: { value, currency: 'TRY', order_id: row.event_id,
          contents, content_ids: contents.map(item => item.id), content_type: 'product', high_value: value > 1000,
          predicted_ltv: await getPredictedLtv(db, order.customer_email, value, row.order_id!) } }
    }
    const authorization = await rpc('authorize_tracking_purchase', { p_payload: snapshot, p_platform: platform })
    if (authorization === 'quarantined') return 'failed'
    if (authorization === 'skipped' || authorization === 'already_sent') continue
    if (authorization !== 'allowed') throw new Error('tracking_lease_lost')
    let outcome = 'sent'
    try {
      if (platform === 'meta') {
        if (!event || !Object.keys(event.user_data).length) throw new Error('purchase_identity_invalid')
        await deliverMeta(event)
      } else {
        await deliverGooglePurchase({ eventId: row.event_id, eventTime: row.event_time, value,
          shipping: order.shipping_cost / 100, contents, tracking })
      }
    } catch (error) {
      outcome = retryable(error) ? 'retryable' : 'uncertain'
    }
    // Do not replace a failed checkpoint with a pending status. Leave the
    // dispatch reservation intact; recovery quarantines the uncertain send.
    const completed = await rpc('complete_tracking_purchase', { p_platform: platform, p_outcome: outcome })
    if (completed !== true) throw new Error('tracking_lease_lost')
    if (outcome === 'uncertain') return 'failed'
  }
  const finished = await rpc('finish_tracking_purchase', { p_retry_seconds: retrySeconds })
  if (finished !== 'sent' && finished !== 'failed' && finished !== 'pending') throw new Error('tracking_lease_lost')
  return finished
}
