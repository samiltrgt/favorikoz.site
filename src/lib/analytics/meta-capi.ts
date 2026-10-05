import 'server-only'
import { drainTrackingOutbox } from '@/lib/tracking/outbox'

/** Paid transition enqueues atomically; failures are retried from SQL outbox. */
export async function sendPurchaseOnce(orderNumber: string): Promise<void> {
  if (!orderNumber) return
  try { await drainTrackingOutbox({ orderNumber, limit: 1 }) }
  catch { console.error('[tracking] Immediate delivery deferred to durable outbox') }
}
export function trySendPurchaseOnce(orderNumber: string | null | undefined): Promise<void> {
  return orderNumber ? sendPurchaseOnce(orderNumber) : Promise.resolve()
}
