'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const ranRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'pending' | 'pending_timeout' | 'success' | 'failed'>('loading')
  const [orderNumber, setOrderNumber] = useState<string>('')

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    const parseTokenFromUrl = () => {
      const fromParams = searchParams.get('token') || searchParams.get('conversationId') || searchParams.get('paymentConversationId')
      if (fromParams) return fromParams
      if (typeof window !== 'undefined') {
        const raw = new URLSearchParams(window.location.search)
        return raw.get('token') || raw.get('conversationId') || raw.get('paymentConversationId')
      }
      return null
    }

    const token = parseTokenFromUrl()
    const order =
      searchParams.get('orderNumber') ||
      (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('orderNumber') : null)
    const paymentId =
      searchParams.get('paymentId') ||
      (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('paymentId') : null)
    if (order) setOrderNumber(order)

    // Debug: Tarayıcıda F12 → Console'da görünür
    const urlParams = { token: token ? `${token.slice(0, 12)}...` : null, orderNumber: order }
    console.log('[Ödeme callback] Sayfa açıldı, URL parametreleri:', urlParams)

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    async function fetchStatus(url: string) {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 25000)
      try {
        return await fetch(url, { signal: ctrl.signal })
      } finally {
        clearTimeout(t)
      }
    }

    const run = async () => {
      try {
        if (!token) {
          console.warn('[Ödeme callback] Token yok – Iyzico bu sayfaya token/conversationId eklemeden yönlendirmiş olabilir. Mevcut URL:', typeof window !== 'undefined' ? window.location.href : '')
          setStatus('failed')
          return
        }
        const params = new URLSearchParams({ token })
        if (order) params.set('orderNumber', order)
        if (paymentId) params.set('paymentId', paymentId)
        const url = `/api/payment/status?${params.toString()}`
        // Sunucu bir istekte v2 tamamlama + kısa retry yapabilir; istemci tarafı sınırlı tekrar.
        for (let i = 0; i < 12; i += 1) {
          let res: Response
          try {
            res = await fetchStatus(url)
          } catch {
            console.warn('[Ödeme callback] İstek zaman aşımı veya ağ hatası, tekrar deneniyor', i + 1)
            setStatus('pending')
            await sleep(2500)
            continue
          }
          let json: { status?: string; error?: string }
          try {
            json = await res.json()
          } catch {
            setStatus('pending')
            await sleep(2500)
            continue
          }
          console.log('[Ödeme callback] API yanıtı:', { ok: res.ok, status: json.status, error: json.error, try: i + 1 })

          if (json.status === 'success') {
            setStatus('success')
            return
          }

          if (json.status === 'pending') {
            setStatus('pending')
            await sleep(2500)
            continue
          }

          setStatus('failed')
          return
        }

        setStatus('pending_timeout')
      } catch (err) {
        console.error('[Ödeme callback] API hatası:', err)
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

      {status === 'pending' && (
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-amber-600 mb-2">Ödeme İşleniyor</h1>
            <p className="text-gray-600 mb-6">3D doğrulama alındı, banka provizyonu tamamlanıyor. Lütfen bekleyin...</p>
          </div>
        </div>
      )}

      {status === 'pending_timeout' && (
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-amber-600 mb-2">Banka Onayı Gecikiyor</h1>
            <p className="text-gray-600 mb-6">
              3D doğrulama alındı ancak banka provizyon sonucu henüz dönmedi. Lütfen 1-2 dakika sonra tekrar kontrol edin.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 mr-3"
            >
              Durumu Yenile
            </button>
            <button
              onClick={() => router.push('/siparislerim')}
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
            >
              Siparişlerim
            </button>
          </div>
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


