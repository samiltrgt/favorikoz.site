// @ts-ignore
import Iyzipay from 'iyzipay'

// Default values for test mode
const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY || 'test-api-key',
  secretKey: process.env.IYZICO_SECRET_KEY || 'test-secret-key',
  uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'
})

export default iyzipay


