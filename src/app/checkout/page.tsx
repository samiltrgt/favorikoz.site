'use client'

import { useState, useEffect } from 'react'

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false)
  const [cartItems, setCartItems] = useState<any[]>([])
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

  useEffect(() => {
    // Load cart items on client side only
    try {
      const raw = localStorage.getItem('cart')
      if (raw) {
        const parsed = JSON.parse(raw)
        const items = parsed.map((i: any) => ({ 
          id: i.id, 
          name: i.name, 
          category: i.category || 'Genel', 
          price: i.price,
          quantity: i.quantity || 1
        }))
        setCartItems(items)
      }
    } catch {
      setCartItems([])
    }

    // Load user profile if logged in
    const loadUserProfile = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        console.log('API response:', data) // Debug log
        
        if (data.success && data.user) {
          // Split full name into name and surname
          const fullName = data.user.name || ''
          const nameParts = fullName.split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''
          
          setCustomerInfo(prev => ({
            ...prev,
            name: firstName,
            surname: lastName,
            email: data.user.email || '',
            phone: data.user.phone || ''
          }))
        }
      } catch (error) {
        console.log('User not logged in or profile not loaded:', error)
      }
    }
    
    loadUserProfile()
  }, [])

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const handlePayment = async () => {
    if (cartItems.length === 0) {
      setError('Sepetiniz boş')
      return
    }

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      setError('Lütfen tüm bilgileri doldurun')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems, customerInfo })
      })
      const result = await response.json()
      
      if (result.success) {
        if (result.requires3DS && result.threeDSHtmlContent) {
          // 3DS authentication required - show in iframe or new window
          const newWindow = window.open('', '_blank')
          if (newWindow) {
            newWindow.document.write(result.threeDSHtmlContent)
            newWindow.document.close()
          }
        } else if (result.paymentPageUrl) {
          // Direct success or payment page redirect
          window.location.href = result.paymentPageUrl
        } else {
          setError('Ödeme yanıtı hatalı')
        }
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
          
          {/* Cart Items */}
          <div className="space-y-2 mb-4">
            {cartItems.length === 0 ? (
              <p className="text-gray-500 text-sm">Sepetiniz boş</p>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span>₺{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          <div className="border-t pt-4 mb-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Toplam</span>
              <span>₺{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {error && <div className="mb-3 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
          <button onClick={handlePayment} disabled={loading || cartItems.length === 0} className="w-full bg-black text-white rounded px-4 py-3 disabled:opacity-50">
            {loading ? 'Ödeme Başlatılıyor...' : cartItems.length === 0 ? 'Sepet Boş' : 'Ödemeye Geç'}
          </button>
        </div>
      </div>
    </div>
  )
}


