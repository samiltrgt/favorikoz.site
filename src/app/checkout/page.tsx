'use client'

import { useState } from 'react'

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    tc: '',
    address: '',
    city: '',
    zipCode: '',
    cardNumber: '',
    expireMonth: '',
    expireYear: '',
    cvc: ''
  })

  const [error, setError] = useState<string | null>(null)

  const getCartItems = () => {
    try {
      const raw = localStorage.getItem('cart')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return parsed.map((i: any) => ({ id: i.id, name: i.name, category: i.category || 'Genel', price: i.price }))
    } catch {
      return []
    }
  }

  const handlePayment = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: getCartItems(), customerInfo })
      })
      const result = await response.json()
      if (result.success && result.paymentPageUrl) {
        window.location.href = result.paymentPageUrl
      } else {
        setError(result.error || 'Ödeme başlatılamadı')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Ödeme</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Müşteri Bilgileri</h2>
          <div className="grid grid-cols-2 gap-3">
            <input className="border rounded px-3 py-2" placeholder="Ad" value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Soyad" value={customerInfo.surname} onChange={(e) => setCustomerInfo({ ...customerInfo, surname: e.target.value })} />
          </div>
          <input className="border rounded px-3 py-2 w-full" placeholder="E-posta" value={customerInfo.email} onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} />
          <input className="border rounded px-3 py-2 w-full" placeholder="Telefon" value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
          <input className="border rounded px-3 py-2 w-full" placeholder="TC Kimlik No" value={customerInfo.tc} onChange={(e) => setCustomerInfo({ ...customerInfo, tc: e.target.value })} />
          <textarea className="border rounded px-3 py-2 w-full" placeholder="Adres" rows={3} value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="border rounded px-3 py-2" placeholder="Şehir" value={customerInfo.city} onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Posta Kodu" value={customerInfo.zipCode} onChange={(e) => setCustomerInfo({ ...customerInfo, zipCode: e.target.value })} />
          </div>
          
          <div className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold">Kart Bilgileri</h2>
            <input className="border rounded px-3 py-2 w-full" placeholder="Kart Numarası" value={customerInfo.cardNumber} onChange={(e) => setCustomerInfo({ ...customerInfo, cardNumber: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <input className="border rounded px-3 py-2" placeholder="Ay" value={customerInfo.expireMonth} onChange={(e) => setCustomerInfo({ ...customerInfo, expireMonth: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Yıl" value={customerInfo.expireYear} onChange={(e) => setCustomerInfo({ ...customerInfo, expireYear: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="CVC" value={customerInfo.cvc} onChange={(e) => setCustomerInfo({ ...customerInfo, cvc: e.target.value })} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Özet</h2>
          {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
          <button onClick={handlePayment} disabled={loading} className="w-full bg-black text-white rounded px-4 py-3 disabled:opacity-50">
            {loading ? 'Ödeme Başlatılıyor...' : 'Ödemeye Geç'}
          </button>
        </div>
      </div>
    </div>
  )
}


