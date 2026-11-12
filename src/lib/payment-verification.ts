import { complete3DSPayment, complete3DSPaymentV2, retrievePayment, retrievePaymentByPaymentId, type IyzicoPaymentResult } from '@/lib/iyzico'
import { buildIyzicoPaidPriceFromOrder, matchesIyzicoOrderPayment } from '@/lib/iyzico-payment-amount'
import { isUnrefundedVerifiedPayment } from '@/lib/payment-reporting'

type PaymentOrder = Parameters<typeof matchesIyzicoOrderPayment>[0] & {
  payment_token?: string | null
  iyzico_payment_id?: string | null
  status?: string
  payment_status?: string
}
export type VerifiedPaymentResult = {
  status: 'verified' | 'failed' | 'unknown'
  result?: IyzicoPaymentResult
  reason?: string
}

/** Callback fields are hints, never proof. Completion is explicitly opt-in. */
export async function resolveVerifiedOrderPayment(
  order: PaymentOrder,
  input: { conversationId?: string | null; paymentId?: string | null; conversationData?: string | null; allowCompletion?: boolean } = {}
): Promise<VerifiedPaymentResult> {
  const unknown = (reason: string, result?: IyzicoPaymentResult): VerifiedPaymentResult => ({ status: 'unknown', reason, result })
  const token = order.payment_token
  if (typeof token !== 'string' || !token.trim() ||
      (input.conversationId != null && input.conversationId !== token)) return unknown('payment_token_mismatch')
  if (['cancelled', 'refunded'].includes(order.status ?? '') || order.payment_status === 'refunded') return unknown('order_not_payable')
  if (!Number.isSafeInteger(order.total) || Number(order.total) <= 0) return unknown('order_amount_invalid')
  const boundId = order.iyzico_payment_id
  if (boundId != null && !/^\d{1,32}$/.test(boundId)) return unknown('payment_id_invalid')

  // An original transaction token must come from the provider, never an echoed
  // request conversationId. Missing provider data cannot authorize completion.
  const matches = (result: IyzicoPaymentResult, expectedId?: string): boolean => Boolean(
    result?.status === 'success' && typeof result.paymentId === 'string' && /^\d{1,32}$/.test(result.paymentId) &&
    (!boundId || result.paymentId === boundId) && (!expectedId || result.paymentId === expectedId) &&
    result.paymentConversationId === token && matchesIyzicoOrderPayment(order, result)
  )
  const classify = async (result: IyzicoPaymentResult, expectedId?: string): Promise<VerifiedPaymentResult> => {
    if (!matches(result, expectedId)) return unknown('payment_binding_unverified', result)
    if (result.paymentStatus === 'SUCCESS') {
      try {
        return await isUnrefundedVerifiedPayment(order, result)
          ? { status: 'verified', result }
          : unknown('reporting_not_verified', result)
      } catch { return unknown('reporting_unavailable', result) }
    }
    if (result.paymentStatus === 'FAILURE') return { status: 'failed', result }
    return unknown('provider_pending', result)
  }

  let result: IyzicoPaymentResult
  try { result = await retrievePayment(token) }
  catch { result = { status: 'failure' } }
  // Only a previously bound database ID may supply an alternative lookup.
  // Browser/webhook IDs never repair a missing authoritative binding.
  if (result?.status !== 'success' && boundId) {
    try { result = await retrievePaymentByPaymentId(boundId) }
    catch { return unknown('provider_unavailable') }
  }
  const first = await classify(result)
  if (first.status !== 'unknown' || !matches(result) || result.paymentStatus !== 'CALLBACK_THREEDS') return first
  if (input.allowCompletion !== true || order.payment_status === 'completed' ||
      ['shipped', 'completed'].includes(order.status ?? '')) return first

  const trustedId = result.paymentId!
  try {
    if (typeof input.conversationData === 'string' && input.conversationData.length > 0) {
      await complete3DSPayment({ conversationId: token, paymentId: trustedId, conversationData: input.conversationData })
    } else {
      await complete3DSPaymentV2({ conversationId: token, paymentId: trustedId,
        paidPrice: buildIyzicoPaidPriceFromOrder(order), basketId: order.iyzico_basket_id! })
    }
  } catch { /* An ambiguous completion must be retrieved, never retried here. */ }
  try {
    // Completion replies cannot substitute a new identity.
    return await classify(await retrievePaymentByPaymentId(trustedId), trustedId)
  } catch { return unknown('provider_unavailable') }
}
