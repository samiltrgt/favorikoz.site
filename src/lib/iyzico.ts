// Lazy load iyzipay to avoid build issues
let iyzipay: any = null

export default function getIyzipay() {
  if (!iyzipay) {
    // Only import and instantiate in runtime
    const Iyzipay = require('iyzipay').default || require('iyzipay')
    
    iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY || 'test-api-key',
      secretKey: process.env.IYZICO_SECRET_KEY || 'test-secret-key',
      uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'
    })
  }
  
  return iyzipay
}


