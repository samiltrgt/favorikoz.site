import { createHmac } from 'crypto'
import { hasCronAuthorization, verifyIyzicoWebhook } from '@/lib/payment-webhook'
const event = { iyziEventType: 'THREE_DS_AUTH', paymentId: '12345', paymentConversationId: 'order-token', status: 'SUCCESS' }
const secret = 'fixture-secret'
const signature = createHmac('sha256', secret).update(secret + event.iyziEventType + event.paymentId + event.paymentConversationId + event.status).digest('hex')
test('validates official direct V3 format and rejects tampering', () => {
  expect(verifyIyzicoWebhook(event, signature, secret)).toBe(true)
  expect(verifyIyzicoWebhook({ ...event, paymentId: '99999' }, signature, secret)).toBe(false)
  expect(verifyIyzicoWebhook(event, null, secret)).toBe(false)
  expect(verifyIyzicoWebhook(event, 'a', secret)).toBe(false)
  expect(verifyIyzicoWebhook(event, signature, undefined)).toBe(false)
  expect(verifyIyzicoWebhook({ ...event, paymentId: 12345 }, signature, secret)).toBe(true)
  expect(verifyIyzicoWebhook({ ...event, paymentId: Number.MAX_SAFE_INTEGER + 1 }, signature, secret)).toBe(false)
})
test('cron fails closed without configuration or correct bearer secret', () => {
  expect(hasCronAuthorization(`Bearer ${secret}`, secret)).toBe(true)
  expect(hasCronAuthorization('Bearer incorrect', secret)).toBe(false)
  expect(hasCronAuthorization('Bearer ', undefined)).toBe(false)
})
