// Iyzico client (will be loaded dynamically)
let Iyzipay: any = null

export default function getIyzipay() {
  // For production, we'll use the SDK when needed
  // For now, return null to use mock mode
  return null
}

// Helper to get base64 credentials
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


