import { complete3DSPaymentV2, retrievePayment, retrievePaymentByPaymentId, type IyzicoPaymentResult } from '@/lib/iyzico'
import { buildIyzicoPaidPriceFromOrder, matchesIyzicoOrderPayment } from '@/lib/iyzico-payment-amount'
import { isUnrefundedVerifiedPayment } from '@/lib/payment-reporting'

type PaymentOrder = Parameters<typeof matchesIyzicoOrderPayment>[0] & { payment_token?: string | null }
export type VerifiedPaymentResult = {
  status: 'verified' | 'failed' | 'unknown'
  result?: IyzicoPaymentResult
  reason?: string
}

/** Callback fields and auth responses are hints only; retrieve from iyzico before changing money state. */
export async function resolveVerifiedOrderPayment(
  order: PaymentOrder,
  input: { conversationId?: string | null; paymentId?: string | null } = {}
): Promise<VerifiedPaymentResult> {
  let last: VerifiedPaymentResult = { status: 'unknown', reason: 'provider_unavailable' }
  const classify = async (result: IyzicoPaymentResult): Promise<VerifiedPaymentResult> => {
    if (result?.status !== 'success') return { status: 'unknown', result, reason: 'provider_unavailable' }
    if (!matchesIyzicoOrderPayment(order, result)) return { status: 'unknown', result, reason: 'payment_order_mismatch' }
    if (result.paymentStatus === 'SUCCESS' && result.paymentId) {
      return await isUnrefundedVerifiedPayment(order, result)
        ? { status: 'verified', result }
        : { status: 'unknown', result, reason: 'reporting_not_verified' }
    }
    if (result.paymentStatus === 'FAILURE') return { status: 'failed', result }
    return { status: 'unknown', result, reason: 'provider_pending' }
  }
  const token = input.conversationId || order.payment_token
  let fallbackId = input.paymentId
  if (token) {
    try {
      last = await classify(await retrievePayment(token))
      if (last.status !== 'unknown') return last
      // An ID from a matching server response is safer than the browser hint.
      if (last.result && matchesIyzicoOrderPayment(order, last.result) && last.result.paymentId) fallbackId = last.result.paymentId
    } catch { /* Connection errors do not establish failure. */ }
  }
  if (fallbackId) {
    try {
      last = await classify(await retrievePaymentByPaymentId(fallbackId))
    } catch { /* Leave unknown for background reconciliation. */ }
  }
  // Complete only a matching, server-retrieved 3DS transaction. Browser IDs are never authorization.
  if (token && last.result?.status === 'success' && last.result.paymentStatus === 'CALLBACK_THREEDS' &&
      last.result.paymentId && matchesIyzicoOrderPayment(order, last.result)) {
    try {
      const trustedId = last.result.paymentId
      try {
        await complete3DSPaymentV2({ conversationId: token, paymentId: trustedId,
          paidPrice: buildIyzicoPaidPriceFromOrder(order), basketId: order.iyzico_basket_id! })
      } catch { /* A duplicate completion error can still mean the payment succeeded. */ }
      last = await classify(await retrievePaymentByPaymentId(trustedId))
    } catch { /* Duplicate auth or timeouts remain unknown; next run retrieves again. */ }
  }
  return last
}
