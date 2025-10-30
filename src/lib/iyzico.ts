// Iyzico REST API implementation (no SDK - avoids Vercel build issues)

import crypto from 'crypto'

// Helper to get credentials
export function getIyzicoCredentials() {
  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  
  // Return null if keys are missing or placeholders
  if (!apiKey || !secretKey) {
    return null
  }
  
  return {
    apiKey,
    secretKey,
    baseUrl: process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
  }
}

// Generate random string for x-iyzi-rnd header
function generateRandomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length)
}

// Make Iyzico REST API call
export async function callIyzicoAPI(
  endpoint: string,
  requestBody: any,
  credentials: { apiKey: string; secretKey: string; baseUrl: string }
): Promise<any> {
  const { apiKey, secretKey, baseUrl } = credentials
  
  // Prepare request body
  const bodyString = JSON.stringify(requestBody)
  const randomString = generateRandomString(16)
  
  // Create hash signature according to Iyzico documentation
  // Format: base64(sha256(apiKey + randomString + secretKey))
  const dataToHash = `${apiKey}${randomString}${secretKey}`
  const hashBuffer = crypto.createHash('sha256').update(dataToHash).digest()
  const hash = hashBuffer.toString('base64')
  
  // Authorization header format: Iyzipay base64(apiKey:hash)
  // This matches Iyzico SDK implementation
  const authString = `${apiKey}:${hash}`
  const authorization = `Iyzipay ${Buffer.from(authString).toString('base64')}`
  
  // Make API request
  const url = `${baseUrl}${endpoint}`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomString,
        'x-iyzi-client-version': 'iyzipay-node-2.0.0'
      },
      body: bodyString
    })
    
    const result = await response.json()
    return result
  } catch (error: any) {
    console.error('Iyzico API call error:', error)
    throw new Error(`Iyzico API call failed: ${error.message}`)
  }
}


