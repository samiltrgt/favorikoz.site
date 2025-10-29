// Iyzico SDK lazy loading to avoid build issues
let IyzipayConstructor: any = null
let iyzipayInstance: any = null

// Lazy load Iyzico SDK
function loadIyzipaySDK() {
  if (typeof window !== 'undefined') {
    // Client-side: don't load SDK
    return null
  }

  if (!IyzipayConstructor) {
    try {
      // Dynamic import to avoid build issues
      const iyzipay = require('iyzipay')
      IyzipayConstructor = iyzipay
      return iyzipay
    } catch (error) {
      console.error('Failed to load Iyzico SDK:', error)
      return null
    }
  }
  
  return IyzipayConstructor
}

// Get initialized Iyzico client instance
export default function getIyzipay() {
  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
  
  if (!apiKey || !secretKey) {
    return null
  }

  // Return existing instance if already created
  if (iyzipayInstance) {
    return iyzipayInstance
  }

  // Load SDK
  const Iyzipay = loadIyzipaySDK()
  if (!Iyzipay) {
    return null
  }

  // Create and cache instance
  try {
    iyzipayInstance = new Iyzipay({
      apiKey,
      secretKey,
      uri: baseUrl
    })
    return iyzipayInstance
  } catch (error) {
    console.error('Failed to create Iyzico instance:', error)
    return null
  }
}

// Helper to get credentials (for manual API calls if needed)
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


