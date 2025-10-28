'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [orderNumber, setOrderNumber] = useState<string>('')

  useEffect(() => {
    const token = searchParams.get('token')
    const statusParam = searchParams.get('status')
    const order = searchParams.get('orderNumber')
    
    if (order) setOrderNumber(order)
    
    // Test mode - check URL parameter first
    if (statusParam === 'success') {
      setStatus('success')
      return
    }
    
    if (statusParam === 'failed') {
      setStatus('failed')
      return
    }
    
    if (!token) {
      setStatus('failed')
      return
    }

    // Check payment status
    const run = async () => {
      try {
        const res = await fetch(`/api/payment/status?token=${token}`)
        const json = await res.json()
        setStatus(json.status === 'success' ? 'success' : 'failed')
      } catch {
        setStatus('failed')
      }
    }
    run()
  }, [searchParams])

  return (
    <div className="container py-16">
      {status === 'loading' && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Ödeme durumu kontrol ediliyor...</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Ödeme Başarılı!</h1>
            {orderNumber && (
              <p className="text-sm text-gray-600 mb-4">Sipariş No: {orderNumber}</p>
            )}
            <p className="text-gray-600 mb-6">Siparişiniz alındı. E-posta ile bilgilendirileceksiniz.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      )}
      
      {status === 'failed' && (
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Ödeme Başarısız</h1>
            <p className="text-gray-600 mb-6">Lütfen tekrar deneyin veya farklı bir kart kullanın.</p>
            <button
              onClick={() => router.push('/checkout')}
              className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 mr-3"
            >
              Tekrar Dene
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
            >
              Ana Sayfa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


