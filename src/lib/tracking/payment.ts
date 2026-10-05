import 'server-only'
/** Row lock + paid transition + purchase enqueue share one SQL transaction. */
export async function confirmOrderPayment(db: { rpc: (name: string, args: Record<string, unknown>) => any }, input: { paymentToken: string; orderNumber?: string | null }): Promise<Record<string, any>> {
  if (!input.paymentToken?.trim()) throw new Error('payment_token_required')
  const { data, error } = await db.rpc('confirm_tracking_payment', { p_payment_token: input.paymentToken.trim(), p_order_number: input.orderNumber?.trim() || null })
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row || row.payment_status !== 'completed' || ['cancelled', 'refunded'].includes(row.status)) throw new Error('payment_confirmation_failed')
  return row
}
