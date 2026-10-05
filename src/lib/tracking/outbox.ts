import 'server-only'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { adItemsFromOrder, adValueFromOrder } from '@/lib/analytics/value'
import { getSiteUrl } from '@/lib/site-url'
import { buildMetaUserData, deliverMeta, type MetaEvent } from './meta'
import { deliverGooglePurchase } from './google'
import { getPredictedLtv } from './ltv'

export type OutboxRow = { id: string; order_id: string | null; owner_hash?: string | null; event_name: string; event_id: string; event_time: number; payload: Record<string, any>; attempts: number; lease_token: string; delivery: Record<string, string> }
export function retryDelaySeconds(attempts: number): number { return Math.min(21600, 30 * 2 ** Math.max(0, attempts - 1)) }

export async function enqueueBrowserEvent(event: MetaEvent, identity: Record<string, any>): Promise<void> {
  const db = createSupabaseAdmin()
  const { error } = await db.rpc('enqueue_tracking_browser', { p_owner_hash: identity.consent_owner, p_version: identity.consent_version, p_consent: identity.consent, p_event: event })
  if (error) throw new Error('tracking_enqueue_failed')
}

/** Lease claims and per-platform checkpoints preserve successful deliveries on retries. */
export async function drainTrackingOutbox(options: { orderNumber?: string; limit?: number } = {}): Promise<{ claimed: number; sent: number; failed: number }> {
  const db = createSupabaseAdmin()
  const { data, error } = await db.rpc('claim_tracking_outbox', { p_limit: Math.min(10, options.limit || 5), p_order_number: options.orderNumber || null })
  if (error) throw new Error('tracking_claim_failed')
  const rows = (data || []) as OutboxRow[]
  const result = { claimed: rows.length, sent: 0, failed: 0 }
  const settled = await Promise.allSettled(rows.map(async (row) => {
    const delivery = { ...row.delivery }
    let lastError = ''
    let suppressed = false
    async function channelAllowed(platform: string): Promise<boolean> {
      if (!row.owner_hash) return !!row.order_id // Only legacy paid orders may lack owner mapping.
      const { data: owner, error: ownerError } = await db.from('tracking_consent').select('analytics,marketing').eq('owner_hash', row.owner_hash).maybeSingle()
      if (ownerError || !owner) throw new Error('tracking_consent_unavailable')
      if (owner[platform === 'meta' ? 'marketing' : 'analytics'] !== true) return false
      const { data: lease, error: leaseError } = await db.from('tracking_outbox').select('status,lease_token').eq('id', row.id).maybeSingle()
      if (leaseError) throw new Error('tracking_lease_unavailable')
      if (!lease || lease.status !== 'processing' || lease.lease_token !== row.lease_token) throw new Error('tracking_lease_lost')
      return true
    }
    if (row.order_id) {
      const { data: current, error: orderError } = await db.from('orders').select('payment_status,status,tracking').eq('id', row.order_id).maybeSingle()
      if (orderError) lastError = 'order_state_unavailable'
      else if (!current || current.payment_status !== 'completed' || ['cancelled', 'refunded'].includes(current.status)) suppressed = true
      else {
        if (current.tracking?.consent?.marketing !== true && delivery.meta !== 'sent') delivery.meta = 'skipped'
        if (current.tracking?.consent?.analytics !== true && delivery.ga4 !== 'sent') delivery.ga4 = 'skipped'
      }
    }
    if (!suppressed && !lastError) {
      for (const platform of ['meta', 'ga4']) {
        if (['sent', 'skipped'].includes(delivery[platform])) continue
        try {
          if (!await channelAllowed(platform)) { delivery[platform] = 'skipped'; continue }
          if (platform === 'meta') {
            let event: MetaEvent = row.payload.meta
            if (row.order_id) {
              const order = row.payload.order
              const tracking = row.payload.tracking || {}
              if (tracking.consent?.marketing !== true) { delivery.meta = 'skipped'; continue }
              const value = adValueFromOrder(order)
              const contents = adItemsFromOrder(order)
              event = { event_name: 'Purchase', event_id: row.event_id, event_time: row.event_time, action_source: 'website', event_source_url: tracking.source_url || `${getSiteUrl()}/checkout`, user_data: buildMetaUserData(tracking, order), custom_data: { value, currency: 'TRY', order_id: row.event_id, contents, content_ids: contents.map((item) => item.id), content_type: 'product', high_value: value > 1000, predicted_ltv: await getPredictedLtv(db, order.customer_email, value, row.order_id) } }
            }
            if (!event || !Object.keys(event.user_data).length) { delivery.meta = 'skipped'; continue }
            // LTV lookup awaits SQL. Recheck immediately after construction so a
            // withdrawal committed during that lookup cannot send stale PII.
            if (!await channelAllowed('meta')) { delivery.meta = 'skipped'; continue }
            await deliverMeta(event)
          } else {
            if (!row.order_id || row.payload.tracking?.consent?.analytics !== true || !row.payload.tracking?.client_id) { delivery.ga4 = 'skipped'; continue }
            if (!await channelAllowed('ga4')) { delivery.ga4 = 'skipped'; continue }
            await deliverGooglePurchase({ eventId: row.event_id, eventTime: row.event_time, value: adValueFromOrder(row.payload.order), shipping: Number(row.payload.order.shipping_cost || 0) / 100, contents: adItemsFromOrder(row.payload.order), tracking: row.payload.tracking })
          }
          delivery[platform] = 'sent'
          const { data: checkpoint, error: checkpointError } = await db.from('tracking_outbox').update({ delivery }).eq('id', row.id).eq('lease_token', row.lease_token).eq('status', 'processing').select('id').maybeSingle()
          if (checkpointError) throw new Error('tracking_checkpoint_failed')
          if (!checkpoint) throw new Error('tracking_lease_lost')
        } catch (failure) {
          const message = failure instanceof Error ? failure.message : 'delivery_failed'
          if (message === 'tracking_lease_lost') throw failure
          lastError = /^[a-z0-9_]+$/.test(message) ? message : 'delivery_network_failed'
        }
      }
    }
    const done = ['meta', 'ga4'].every((platform) => ['sent', 'skipped'].includes(delivery[platform]))
    const status = suppressed ? 'suppressed' : done ? 'sent' : row.attempts >= 12 ? 'failed' : 'pending'
    const { error: finishError } = await db.rpc('finish_tracking_outbox', { p_id: row.id, p_lease_token: row.lease_token, p_status: status, p_delivery: delivery, p_error: lastError || null, p_retry_seconds: retryDelaySeconds(row.attempts) })
    if (finishError) throw new Error('tracking_finish_failed')
    if (status === 'sent') result.sent++
    else if (status === 'failed') result.failed++
  }))
  if (settled.some((entry) => entry.status === 'rejected')) throw new Error('tracking_batch_incomplete')
  return result
}
