import { getIyzicoCredentials, type IyzicoPaymentResult } from '@/lib/iyzico'
import { matchesIyzicoOrderPayment } from '@/lib/iyzico-payment-amount'
import { createHmac, randomBytes } from 'crypto'

type Order = Parameters<typeof matchesIyzicoOrderPayment>[0] & { payment_token?: string | null }

/** Retrieve can still say SUCCESS after a refund: reporting is a separate financial guard. */
export function isUnrefundedPaymentReport(order: Order, result: IyzicoPaymentResult, report: any): boolean {
  if (!matchesIyzicoOrderPayment(order, result)) return false
  if (report?.status !== 'success' || !Array.isArray(report.payments) || report.payments.length !== 1) return false
  const payment = report.payments[0]
  // Reporting exposes a provider-internal basket ID; retrieval is the canonical basket binding.
  return Boolean(result.paymentId && String(payment.paymentId) === String(result.paymentId) &&
    payment.paymentConversationId === order.payment_token && matchesIyzicoOrderPayment(order, { ...payment, basketId: result.basketId }) &&
    payment.paymentStatus === 1 && payment.fraudStatus === 1 && payment.paymentRefundStatus === 'NOT_REFUNDED' &&
    Array.isArray(payment.cancels) && payment.cancels.length === 0 &&
    Array.isArray(payment.itemTransactions) && payment.itemTransactions.length > 0 &&
    payment.itemTransactions.every((item: any) => [1, 2].includes(item.transactionStatus) && Array.isArray(item.refunds) && item.refunds.length === 0))
}

export async function isUnrefundedVerifiedPayment(order: Order, result: IyzicoPaymentResult): Promise<boolean> {
  const credentials = getIyzicoCredentials()
  if (!credentials || !result.paymentId) return false
  const path = '/v2/reporting/payment/details'
  const random = randomBytes(16).toString('hex')
  // GET signs no body (the SDK's POST helper would incorrectly append '{}').
  const signature = createHmac('sha256', credentials.secretKey).update(random + path).digest('hex')
  const authorization = 'IYZWSv2 ' + Buffer.from(`apiKey:${credentials.apiKey}&randomKey:${random}&signature:${signature}`).toString('base64')
  try {
    const response = await fetch(`${credentials.baseUrl.replace(/\/+$/, '')}${path}?locale=tr&paymentId=${encodeURIComponent(result.paymentId)}`, {
      headers: { Authorization: authorization, 'x-iyzi-rnd': random, Accept: 'application/json', 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000), cache: 'no-store',
    })
    return response.ok && isUnrefundedPaymentReport(order, result, await response.json())
  } catch { return false }
}
