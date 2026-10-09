import type { SupabaseClient } from '@supabase/supabase-js'
import { tryProcessOrderNotifications } from '@/lib/email-notifications'

/** Payment confirmation queues customer and admin mail in the database transaction. */
export async function trySendOrderConfirmationEmail(
  supabase: SupabaseClient,
  lookup: { orderNumber?: string | null; paymentToken?: string | null }
): Promise<void> {
  try {
    let query = supabase.from('orders').select('id').eq('payment_status', 'completed')
    if (lookup.orderNumber) query = query.eq('order_number', lookup.orderNumber)
    else if (lookup.paymentToken) query = query.eq('payment_token', lookup.paymentToken)
    else return
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error('order_email_lookup_failed')
    if (data) await tryProcessOrderNotifications(supabase, data.id)
  } catch (err) {
    console.error('[order-email]', err instanceof Error ? err.message : 'order_email_unavailable')
  }
}
