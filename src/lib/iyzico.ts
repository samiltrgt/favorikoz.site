// Iyzico SDK implementation with Vercel compatibility

import Iyzipay from 'iyzipay'

let iyzipayInstance: Iyzipay | null = null

export function getIyzicoInstance(): Iyzipay | null {
  if (iyzipayInstance) {
    return iyzipayInstance
  }

  const apiKey = process.env.IYZICO_API_KEY?.trim()
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim()
  
  if (!apiKey || !secretKey) {
    console.error('❌ Iyzico credentials missing')
    return null
  }
  
  const baseUrl = process.env.IYZICO_BASE_URL?.trim() || 'https://sandbox-api.iyzipay.com'
  const isSandbox = baseUrl.includes('sandbox')
  
  console.log(`🔧 Iyzico SDK: ${isSandbox ? 'SANDBOX 🧪' : 'PRODUCTION 🚀'}`)
  console.log(`   Base URL: ${baseUrl}`)
  
  try {
    iyzipayInstance = new Iyzipay({
      apiKey: apiKey,
      secretKey: secretKey,
      uri: baseUrl
    })
    return iyzipayInstance
  } catch (error) {
    console.error('❌ Failed to initialize Iyzico SDK:', error)
    return null
  }
}

export function getIyzicoCredentials() {
  const apiKey = process.env.IYZICO_API_KEY?.trim()
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim()
  
  if (!apiKey || !secretKey) {
    return null
  }
  
  const baseUrl = process.env.IYZICO_BASE_URL?.trim() || 'https://sandbox-api.iyzipay.com'
  
  return { apiKey, secretKey, baseUrl }
}

// Create payment using Iyzico SDK
export async function createPayment(paymentRequest: any): Promise<any> {
  const iyzipay = getIyzicoInstance()
  
  if (!iyzipay) {
    throw new Error('Iyzico SDK not initialized')
  }
  
  console.log('📤 Sending payment via Iyzico SDK')
  
  return new Promise((resolve, reject) => {
    iyzipay.payment.create(paymentRequest, (err: any, result: any) => {
      if (err) {
        console.error('❌ SDK Error:', err)
        reject(err)
        return
      }
      
      console.log('📥 Response:', {
        status: result.status,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        paymentId: result.paymentId
      })
      
      resolve(result)
    })
  })
}


