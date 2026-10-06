import { matchesIyzicoOrderPayment } from '@/lib/iyzico-payment-amount'
import { type IyzicoPaymentResult } from '@/lib/iyzico'
type Db = { rpc: (name: string, args: Record<string, unknown>) => any }
type Order = Parameters<typeof matchesIyzicoOrderPayment>[0] & { id: string; status: string; payment_status: string; iyzico_payment_id?: string | null }

/** Caller must have retrieved SUCCESS and checked reporting, never pass raw callback data. */
export async function reconcileVerifiedPayment(db: Db, order: Order, result: IyzicoPaymentResult): Promise<Record<string, any>> {
  if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS' || !result.paymentId ||
    !matchesIyzicoOrderPayment(order, result) || order.status === 'refunded' || order.payment_status === 'refunded' ||
    (order.iyzico_payment_id && order.iyzico_payment_id !== result.paymentId)) throw new Error('payment_binding_invalid')
  const { data, error } = await db.rpc('reconcile_verified_payment', {
    p_order_id: order.id, p_payment_id: result.paymentId, p_basket_id: result.basketId,
    p_total: Number(order.total),
  })
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row || row.payment_status !== 'completed') throw new Error('payment_reconciliation_failed')
  return row
}
