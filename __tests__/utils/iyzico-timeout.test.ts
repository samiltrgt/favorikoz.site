const mockRetrieve = jest.fn()
const mockComplete = jest.fn()
jest.mock('iyzipay', () => jest.fn().mockImplementation(() => ({ payment: { retrieve: mockRetrieve }, threedsPayment: { create: mockComplete } })))
import { retrievePayment, retrievePaymentByPaymentId, complete3DSPayment } from '@/lib/iyzico'
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks()
  process.env.IYZICO_API_KEY = 'api'; process.env.IYZICO_SECRET_KEY = 'secret'
  jest.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })
test('SDK silence resolves retrieval as unknown-capable failure within ten seconds', async () => {
  const token = retrievePayment('token')
  const id = retrievePaymentByPaymentId('123')
  await jest.advanceTimersByTimeAsync(10000)
  await expect(token).resolves.toEqual({ status: 'failure', errorMessage: 'Provider query timed out' })
  await expect(id).resolves.toEqual({ status: 'failure', errorMessage: 'Provider query timed out' })
})
test('3DS completion timeout rejects without claiming final payment failure', async () => {
  const promise = complete3DSPayment({ conversationId: 'token', paymentId: '123', conversationData: 'data' })
  const assertion = expect(promise).rejects.toThrow('Iyzico completion timed out')
  await jest.advanceTimersByTimeAsync(10000)
  await assertion
})
test('successful SDK callback clears timer', async () => {
  mockRetrieve.mockImplementationOnce((_request, callback) => callback(null, { status: 'success', paymentStatus: 'SUCCESS', paymentId: '123' }))
  await expect(retrievePayment('token')).resolves.toMatchObject({ status: 'success', paymentId: '123' })
  expect(jest.getTimerCount()).toBe(0)
})
