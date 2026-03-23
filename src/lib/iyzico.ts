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

// 3DS initialize (zorunlu 3DS için)
export async function initialize3DSPayment(paymentRequest: any): Promise<any> {
  const iyzipay = getIyzicoInstance()
  if (!iyzipay) {
    throw new Error('Iyzico SDK not initialized')
  }

  console.log('📤 Sending 3DS initialize via Iyzico SDK')

  return new Promise((resolve, reject) => {
    ;(iyzipay as any).threedsInitialize.create(paymentRequest, (err: any, result: any) => {
      if (err) {
        console.error('❌ 3DS Initialize SDK Error:', err)
        reject(err)
        return
      }
      console.log('📥 3DS Initialize Response:', {
        status: result?.status,
        errorCode: result?.errorCode,
        errorMessage: result?.errorMessage,
        paymentId: result?.paymentId,
      })
      resolve(result)
    })
  })
}

// 3DS complete (callback sonrası ödeme tamamlama)
export async function complete3DSPayment(payload: {
  conversationId: string
  paymentId: string
  conversationData: string
}): Promise<any> {
  const iyzipay = getIyzicoInstance()
  if (!iyzipay) {
    throw new Error('Iyzico SDK not initialized')
  }

  return new Promise((resolve, reject) => {
    ;(iyzipay as any).threedsPayment.create(
      {
        locale: 'tr',
        conversationId: payload.conversationId,
        paymentId: payload.paymentId,
        conversationData: payload.conversationData,
      },
      (err: any, result: any) => {
        if (err) {
          console.error('❌ 3DS Complete SDK Error:', err)
          reject(err)
          return
        }
        console.log('📥 3DS Complete Response:', {
          status: result?.status,
          errorCode: result?.errorCode,
          errorMessage: result?.errorMessage,
          paymentId: result?.paymentId,
          paymentStatus: result?.paymentStatus,
        })
        resolve(result)
      }
    )
  })
}

/** Ödeme sonucunu conversationId ile sorgula (callback sayfası için) */
export async function retrievePayment(conversationId: string): Promise<{ status: string; paymentStatus?: string; errorMessage?: string }> {
  const iyzipay = getIyzicoInstance()
  if (!iyzipay) {
    return { status: 'failure', errorMessage: 'Iyzico SDK not initialized' }
  }
  return new Promise((resolve) => {
    ;(iyzipay as any).payment.retrieve(
      {
        locale: 'tr',
        conversationId: conversationId,
        paymentConversationId: conversationId,
      },
      (err: any, result: any) => {
        if (err) {
          console.error('❌ Iyzico retrieve error:', err)
          resolve({ status: 'failure', errorMessage: err?.message || 'Sorgu hatası' })
          return
        }
        resolve({
          status: result?.status === 'success' ? 'success' : 'failure',
          paymentStatus: result?.paymentStatus,
          errorMessage: result?.errorMessage,
        })
      }
    )
  })
}


