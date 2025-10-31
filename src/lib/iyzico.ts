// Iyzico implementation using official SDK for proper authentication

import Iyzipay from 'iyzipay'

// Helper to get Iyzico SDK instance
export function getIyzicoInstance() {
  const apiKey = process.env.IYZICO_API_KEY?.trim()
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim()
  
  // Return null if keys are missing
  if (!apiKey || !secretKey) {
    console.error('❌ Iyzico credentials missing')
    return null
  }
  
  const rawBaseUrl = process.env.IYZICO_BASE_URL?.trim()
  const baseUrl = rawBaseUrl || 'https://sandbox-api.iyzipay.com'
  const isSandbox = baseUrl.includes('sandbox')
  
  // Log environment
  console.log(`🔧 Iyzico SDK Initialized:`)
  console.log(`   Environment: ${isSandbox ? 'SANDBOX 🧪' : 'PRODUCTION 🚀'}`)
  console.log(`   Base URL: ${baseUrl}`)
  console.log(`   API Key: ${apiKey.substring(0, 15)}...`)
  
  // Create Iyzico instance with official SDK
  const iyzipay = new Iyzipay({
    apiKey: apiKey,
    secretKey: secretKey,
    uri: baseUrl
  })
  
  return iyzipay
}

// Legacy function for backward compatibility
export function getIyzicoCredentials() {
  const apiKey = process.env.IYZICO_API_KEY?.trim()
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim()
  
  if (!apiKey || !secretKey) {
    return null
  }
  
  const baseUrl = process.env.IYZICO_BASE_URL?.trim() || 'https://sandbox-api.iyzipay.com'
  
  return {
    apiKey,
    secretKey,
    baseUrl
  }
}

// Create payment using Iyzico SDK (replaces manual REST API calls)
export async function createPayment(paymentRequest: any): Promise<any> {
  const iyzipay = getIyzicoInstance()
  
  if (!iyzipay) {
    throw new Error('Iyzico SDK not initialized - check credentials')
  }
  
  console.log('📤 Sending payment request via Iyzico SDK')
  
  return new Promise((resolve, reject) => {
    iyzipay.payment.create(paymentRequest, (err: any, result: any) => {
      if (err) {
        console.error('❌ Iyzico SDK Error:', err)
        reject(err)
        return
      }
      
      console.log('📥 Iyzico SDK Response:', {
        status: result.status,
        errorMessage: result.errorMessage,
        errorCode: result.errorCode,
        paymentId: result.paymentId,
        threeDSHtmlContent: result.threeDSHtmlContent ? 'present' : 'not present'
      })
      
      if (result.status === 'failure') {
        console.error('❌ Payment Error:', {
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          errorGroup: result.errorGroup
        })
      }
      
      resolve(result)
    })
  })
}


