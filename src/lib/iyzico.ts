// Iyzico REST API implementation (no SDK - avoids Vercel build issues)

import crypto from 'crypto'

// Helper to get credentials
export function getIyzicoCredentials() {
  const apiKey = process.env.IYZICO_API_KEY?.trim()
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim()
  
  // Return null if keys are missing or placeholders
  if (!apiKey || !secretKey) {
    return null
  }
  
  // Debug: Log raw environment variable value
  const rawBaseUrl = process.env.IYZICO_BASE_URL
  console.log(`🔍 Environment Variable Debug:`, {
    'IYZICO_BASE_URL (raw)': rawBaseUrl || '(not set)',
    'IYZICO_BASE_URL (trimmed)': rawBaseUrl?.trim() || '(not set)',
    'Will use': rawBaseUrl?.trim() || 'https://sandbox-api.iyzipay.com (default)'
  })
  
  const baseUrl = rawBaseUrl?.trim() || 'https://sandbox-api.iyzipay.com'
  const isSandbox = baseUrl.includes('sandbox')
  
  // Log which environment is being used
  console.log(`🔧 Iyzico environment: ${isSandbox ? 'SANDBOX 🧪' : 'PRODUCTION 🚀'}`)
  console.log(`   Base URL: ${baseUrl}`)
  console.log(`   API Key length: ${apiKey.length} (first 8 chars: ${apiKey.substring(0, 8)}...)`)
  
  return {
    apiKey,
    secretKey,
    baseUrl
  }
}

// Generate random string for x-iyzi-rnd header
function generateRandomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length)
}

// Helper function to sort object keys recursively (for consistent JSON stringify)
function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sortKeys(item))
  }
  
  const sorted: any = {}
  const keys = Object.keys(obj).sort()
  for (const key of keys) {
    sorted[key] = sortKeys(obj[key])
  }
  return sorted
}

// Make Iyzico REST API call
export async function callIyzicoAPI(
  endpoint: string,
  requestBody: any,
  credentials: { apiKey: string; secretKey: string; baseUrl: string }
): Promise<any> {
  const { apiKey, secretKey, baseUrl } = credentials
  
  // Normalize request body: sort keys alphabetically for consistent hashing
  // This ensures the JSON string is always the same for the same data
  const normalizedBody = sortKeys(requestBody)
  const bodyString = JSON.stringify(normalizedBody)
  
  const randomString = generateRandomString(16)
  
  // Create hash signature according to Iyzico documentation
  // Format: base64(sha256(apiKey + randomString + secretKey + requestBody))
  // IMPORTANT: The request body must be included in the hash!
  // CRITICAL: All parts must be concatenated without any separators or encoding
  const dataToHash = `${apiKey}${randomString}${secretKey}${bodyString}`
  
  console.log(`🔐 Hash calculation:`, {
    apiKeyLength: apiKey.length,
    randomStringLength: randomString.length,
    secretKeyLength: secretKey.length,
    bodyStringLength: bodyString.length,
    totalHashDataLength: dataToHash.length,
    randomStringPrefix: randomString.substring(0, 8)
  })
  
  const hashBuffer = crypto.createHash('sha256').update(dataToHash, 'utf8').digest()
  const hash = hashBuffer.toString('base64')
  
  // Authorization header format: Iyzipay base64(apiKey:hash)
  // This matches Iyzico SDK implementation
  const authString = `${apiKey}:${hash}`
  const authorization = `Iyzipay ${Buffer.from(authString, 'utf8').toString('base64')}`
  
  console.log(`🔑 Authorization header:`, {
    hashLength: hash.length,
    authStringLength: authString.length,
    authorizationPrefix: authorization.substring(0, 30) + '...'
  })
  
  // Make API request
  const url = `${baseUrl}${endpoint}`
  
  try {
    console.log(`📤 Iyzico API Request:`, {
      endpoint,
      url,
      method: 'POST',
      hasBody: !!bodyString,
      bodyLength: bodyString.length
    })
    
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
    
    console.log(`📥 Iyzico API Response:`, {
      status: response.status,
      statusText: response.statusText,
      resultStatus: result.status,
      errorMessage: result.errorMessage,
      errorCode: result.errorCode
    })
    
    if (result.status === 'failure' || response.status !== 200) {
      console.error('❌ Iyzico API Error Details:', {
        status: result.status,
        errorMessage: result.errorMessage,
        errorCode: result.errorCode,
        errorGroup: result.errorGroup,
        httpStatus: response.status
      })
    }
    
    return result
  } catch (error: any) {
    console.error('❌ Iyzico API call error:', error)
    throw new Error(`Iyzico API call failed: ${error.message}`)
  }
}


