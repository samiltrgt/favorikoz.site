import 'server-only'
import { adValueFromOrder } from '@/lib/analytics/value'
/** An estimate, not additional revenue. Schema uses completed, not delivered/total_price. */
export async function getPredictedLtv(db: { from: (table: string) => any }, email: string | undefined, currentValue: number, currentOrderId: string): Promise<number> {
  if (!email) return Math.round(currentValue * 2.5 * 100) / 100
  // Legacy checkout rows stored mixed-case email. Escape LIKE wildcards so an
  // email containing '%' or '_' cannot match other customers' order histories.
  const normalizedEmail = email.trim().toLowerCase().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
  const { data, error } = await db.from('orders').select('items, shipping_cost, total, discount_amount').ilike('customer_email', normalizedEmail).eq('payment_status', 'completed').eq('status', 'completed').neq('id', currentOrderId).limit(1000)
  if (error || !data?.length) return Math.round(currentValue * 2.5 * 100) / 100
  const values = data.map((order: any) => adValueFromOrder(order)).filter((value: number) => Number.isFinite(value) && value >= 0)
  if (!values.length) return Math.round(currentValue * 2.5 * 100) / 100
  const historical = values.reduce((sum: number, value: number) => sum + value, 0)
  return Math.round((historical + currentValue + historical / values.length * 0.8) * 100) / 100
}
