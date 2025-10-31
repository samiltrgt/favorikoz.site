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
  console.log(`   API Key length: ${apiKey.length} (first 15 chars: ${apiKey.substring(0, 15)}...)`)
  console.log(`   Secret Key length: ${secretKey.length} (first 15 chars: ${secretKey.substring(0, 15)}...)`)
  
  // Warn if keys look suspicious
  if (isSandbox && apiKey.length < 20) {
    console.warn('⚠️ WARNING: Sandbox API Key seems too short. Expected length: 20-40 chars')
  }
  if (!isSandbox && apiKey.length < 20) {
    console.warn('⚠️ WARNING: Production API Key seems too short. Expected length: 20-40 chars')
  }
  
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
  
  // Generate random string FIRST (must be generated before body stringification)
  const randomString = generateRandomString(16)
  
  // IMPORTANT: Iyzico expects the exact body string that will be sent
  // Don't modify the body structure - use it as-is for hash calculation
  // JSON.stringify without spaces for consistent hashing
  const bodyString = JSON.stringify(requestBody)
  
  // ATTEMPT 1: Hash WITHOUT body (apiKey + randomString + secretKey only)
  // Some versions of Iyzico API don't include body in hash
  const dataToHashWithoutBody = apiKey + randomString + secretKey
  
  // ATTEMPT 2: Hash WITH body (apiKey + randomString + secretKey + body)
  const dataToHashWithBody = apiKey + randomString + secretKey + bodyString
  
  // Try WITHOUT body first
  const dataToHash = dataToHashWithoutBody
  
  console.log(`🔐 Hash calculation debug (trying WITHOUT body):`, {
    apiKeyLength: apiKey.length,
    apiKeyPreview: apiKey.substring(0, 10) + '...',
    randomString: randomString,
    randomStringLength: randomString.length,
    secretKeyLength: secretKey.length,
    bodyStringLength: bodyString.length,
    totalHashDataLength: dataToHash.length,
    hashMethod: 'WITHOUT body',
    dataToHashPreview: dataToHash.substring(0, 50) + '...'
  })
  
  // Calculate SHA256 hash and encode as base64
  const hashBuffer = crypto.createHash('sha256').update(dataToHash, 'utf8').digest()
  const hash = hashBuffer.toString('base64')
  
  console.log(`🔐 Hash result:`, {
    hashLength: hash.length,
    hashPreview: hash.substring(0, 20) + '...'
  })
  
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
        httpStatus: response.status,
        fullResponse: JSON.stringify(result, null, 2)
      })
      
      // Specific guidance for error code 1003 (Authorization error)
      if (result.errorCode === '1003') {
        console.error('⚠️ AUTHORIZATION ERROR (1003) - Possible causes:')
        console.error('   1. Wrong API Key or Secret Key')
        console.error('   2. Using Production keys with Sandbox URL (or vice versa)')
        console.error('   3. Keys have extra spaces or special characters')
        console.error('   4. Hash calculation mismatch')
        console.error(`   Current Base URL: ${baseUrl}`)
        console.error(`   Is Sandbox: ${baseUrl.includes('sandbox')}`)
        console.error(`   API Key starts with: ${apiKey.substring(0, 15)}...`)
        console.error('   💡 Check: API keys must match the environment (sandbox keys → sandbox URL)')
      }
    }
    
    return result
  } catch (error: any) {
    console.error('❌ Iyzico API call error:', error)
    throw new Error(`Iyzico API call failed: ${error.message}`)
  }
}


