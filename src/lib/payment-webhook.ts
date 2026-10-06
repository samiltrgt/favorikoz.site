import { createHmac, timingSafeEqual } from 'crypto'

export type DirectPaymentWebhook = { iyziEventType: string; paymentId: string | number; paymentConversationId: string; status: string }

/** Only the direct API format used by this checkout. Reject unsigned/legacy formats. */
export function verifyIyzicoWebhook(body: unknown, signature: string | null, secret: string | undefined): body is DirectPaymentWebhook {
  if (!secret || !signature || !/^[a-fA-F0-9]{64}$/.test(signature) || !body || typeof body !== 'object') return false
  const data = body as Record<string, unknown>
  const fields = ['iyziEventType', 'paymentId', 'paymentConversationId', 'status']
  if (!fields.every(key => key === 'paymentId'
    ? (typeof data[key] === 'string' && /^[0-9]{1,32}$/.test(data[key] as string)) || (typeof data[key] === 'number' && Number.isSafeInteger(data[key]) && Number(data[key]) > 0)
    : typeof data[key] === 'string' && (data[key] as string).length > 0 && (data[key] as string).length <= 256)) return false
  if (!['PAYMENT_API', 'API_AUTH', 'THREE_DS_AUTH', 'THREE_DS_CALLBACK'].includes(data.iyziEventType as string)) return false
  const expected = createHmac('sha256', secret).update(secret + fields.map(key => data[key]).join('')).digest()
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'))
}

export function hasCronAuthorization(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false
  const actual = Buffer.from(header); const expected = Buffer.from(`Bearer ${secret}`)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
