'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')

  useEffect(() => {
    const token = searchParams.get('token')
    const statusParam = searchParams.get('status')
    
    // Test mode - check URL parameter first
    if (statusParam === 'success') {
      setStatus('success')
      return
    }
    
    if (!token) return setStatus('failed')
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
    <div className="container py-16 text-center">
      {status === 'loading' && <p>Ödeme durumu kontrol ediliyor...</p>}
      {status === 'success' && (
        <div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">Ödeme Başarılı</h1>
          <p>Siparişiniz alındı. E-posta ile bilgilendirileceksiniz.</p>
        </div>
      )}
      {status === 'failed' && (
        <div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Ödeme Başarısız</h1>
          <p>Lütfen tekrar deneyin veya farklı bir kart kullanın.</p>
        </div>
      )}
    </div>
  )
}


