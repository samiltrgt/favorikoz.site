'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Check, 
  CreditCard, 
  MapPin, 
  Truck, 
  Shield, 
  User,
  Phone,
  Mail,
  Lock,
  Package
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { getCart } from '@/lib/cart'

type Step = 'info' | 'shipping' | 'payment'

type CartItem = {
  id: string
  slug: string
  name: string
  image: string
  price: number
  qty: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('info')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    // Müşteri Bilgileri
    name: '',
    surname: '',
    email: '',
    phone: '',
    tc: '',
    
    // Adres Bilgileri
    address: '',
    city: '',
    district: '',
    zipCode: '',
    
    // Kargo Seçimi
    shippingMethod: 'standard',
    
    // Ödeme Bilgileri
    cardNumber: '',
    cardName: '',
    expireMonth: '',
    expireYear: '',
    cvc: '',
    
    // Sözleşmeler
    termsAccepted: false,
    kvkkAccepted: false,
  })

  // Load cart and user profile
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load cart
        const cart = getCart()
        setCartItems(cart)

    // Load user profile if logged in
        const response = await fetch('/api/auth/me')
        const result = await response.json()
        
        if (result.success && result.user) {
          const fullName = result.user.name || ''
          const nameParts = fullName.split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''
          
          setFormData(prev => ({
            ...prev,
            name: firstName,
            surname: lastName,
            email: result.user.email || '',
            phone: result.user.phone || ''
          }))
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const FREE_SHIPPING_THRESHOLD = 14990 // 1499 TL in 10x format
  const SHIPPING_COST = formData.shippingMethod === 'express' ? 2000 : 1000 // 200 TL or 100 TL
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total = subtotal + shipping

  // Validation
  const validateStep = (step: Step): boolean => {
    setError(null)
    
    if (step === 'info') {
      if (!formData.name || !formData.surname || !formData.email || !formData.phone) {
        setError('Lütfen tüm kişisel bilgileri doldurun')
        return false
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError('Geçerli bir e-posta adresi girin')
        return false
      }
      if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
        setError('Geçerli bir telefon numarası girin')
        return false
      }
      return true
    }
    
    if (step === 'shipping') {
      if (!formData.address || !formData.city || !formData.district) {
        setError('Lütfen tüm adres bilgilerini doldurun')
        return false
      }
      return true
    }
    
    return true
  }

  const handleNextStep = () => {
    if (currentStep === 'info' && validateStep('info')) {
      setCurrentStep('shipping')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (currentStep === 'shipping' && validateStep('shipping')) {
      setCurrentStep('payment')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePreviousStep = () => {
    setError(null)
    if (currentStep === 'payment') {
      setCurrentStep('shipping')
    } else if (currentStep === 'shipping') {
      setCurrentStep('info')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePayment = async () => {
    if (!formData.termsAccepted || !formData.kvkkAccepted) {
      setError('Lütfen sözleşmeleri kabul edin')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            category: 'Kozmetik',
            price: item.price,
            quantity: item.qty
          })),
          customerInfo: {
            name: formData.name,
            surname: formData.surname,
            email: formData.email,
            phone: formData.phone,
            tc: formData.tc,
            address: formData.address,
            city: formData.city,
            zipCode: formData.zipCode,
            cardNumber: formData.cardNumber,
            cardName: formData.cardName,
            expireMonth: formData.expireMonth,
            expireYear: formData.expireYear,
            cvc: formData.cvc
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        if (result.requires3DS && result.threeDSHtmlContent) {
          const newWindow = window.open('', '_blank')
          if (newWindow) {
            newWindow.document.write(result.threeDSHtmlContent)
            newWindow.document.close()
          }
        } else if (result.paymentPageUrl) {
          window.location.href = result.paymentPageUrl
        }
      } else {
        setError(result.error || 'Ödeme işlemi başlatılamadı')
      }
    } catch (err: any) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
      console.error('Payment error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container py-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (cartItems.length === 0) {
  return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container py-20">
          <div className="max-w-md mx-auto text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sepetiniz Boş</h1>
            <p className="text-gray-600 mb-6">Ödeme yapabilmek için sepetinize ürün eklemelisiniz.</p>
            <Link
              href="/tum-urunler"
              className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Alışverişe Başla
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const steps = [
    { id: 'info', label: 'Bilgileriniz', icon: User },
    { id: 'shipping', label: 'Teslimat', icon: Truck },
    { id: 'payment', label: 'Ödeme', icon: CreditCard },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Breadcrumb */}
      <nav className="bg-white border-b border-gray-200 py-3">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-black">Anasayfa</Link>
            <span>/</span>
            <Link href="/sepet" className="hover:text-black">Sepet</Link>
            <span>/</span>
            <span className="text-black font-medium">Ödeme</span>
          </div>
        </div>
      </nav>

      <div className="container py-8 lg:py-12">
        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto mb-8 lg:mb-12">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = index < currentStepIndex

  return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-black text-white scale-110'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 lg:w-6 lg:h-6" />
                      ) : (
                        <StepIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs lg:text-sm font-medium ${
                        isActive ? 'text-black' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 lg:mx-4 transition-all duration-300 ${
                        index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
            </div>
              )
            })}
          </div>
          </div>
          
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 lg:p-8">
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Step: Info */}
              {currentStep === 'info' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-2">Kişisel Bilgiler</h2>
                    <p className="text-gray-600 text-sm">Fatura ve iletişim bilgilerinizi girin</p>
            </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ad <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                          placeholder="Adınız"
                          required
                        />
          </div>
        </div>

        <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Soyad <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.surname}
                        onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="Soyadınız"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-posta <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="ornek@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="5XX XXX XX XX"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TC Kimlik No (İsteğe bağlı)
                    </label>
                    <input
                      type="text"
                      value={formData.tc}
                      onChange={(e) => setFormData({ ...formData, tc: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      placeholder="11 haneli TC kimlik numaranız"
                      maxLength={11}
                    />
                  </div>

                  <button
                    onClick={handleNextStep}
                    className="w-full bg-black text-white py-4 rounded-lg font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Teslimat Bilgilerine Geç
                  </button>
                </div>
              )}

              {/* Step: Shipping */}
              {currentStep === 'shipping' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-2">Teslimat Adresi</h2>
                    <p className="text-gray-600 text-sm">Ürünlerinizin gönderileceği adresi belirtin</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adres <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="Mahalle, sokak, bina no, daire no"
                        rows={3}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İl <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="İl"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İlçe <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="İlçe"
                        required
                      />
          </div>
        </div>

        <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Posta Kodu (İsteğe bağlı)
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      placeholder="34000"
                    />
                  </div>

                  {/* Shipping Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Kargo Seçimi
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-black transition-all">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            value="standard"
                            checked={formData.shippingMethod === 'standard'}
                            onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
                            className="w-4 h-4"
                          />
                          <div>
                            <div className="font-medium text-black">Standart Kargo</div>
                            <div className="text-sm text-gray-600">2-4 iş günü</div>
                          </div>
                        </div>
                        <div className="font-medium">
                          {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                            <span className="text-green-600">Ücretsiz</span>
                          ) : (
                            <span>₺100</span>
                          )}
                        </div>
                      </label>

                      <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-black transition-all">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            value="express"
                            checked={formData.shippingMethod === 'express'}
                            onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
                            className="w-4 h-4"
                          />
                          <div>
                            <div className="font-medium text-black">Hızlı Kargo</div>
                            <div className="text-sm text-gray-600">1-2 iş günü</div>
                          </div>
                        </div>
                        <div className="font-medium">₺200</div>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handlePreviousStep}
                      className="flex-1 bg-gray-100 text-black py-4 rounded-lg font-medium hover:bg-gray-200 transition-all duration-300"
                    >
                      Geri
                    </button>
                    <button
                      onClick={handleNextStep}
                      className="flex-1 bg-black text-white py-4 rounded-lg font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      Ödeme Bilgilerine Geç
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Payment */}
              {currentStep === 'payment' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-2">Ödeme Bilgileri</h2>
                    <p className="text-gray-600 text-sm">Güvenli ödeme için kart bilgilerinizi girin</p>
                  </div>

                  {/* Security Badge */}
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">
                      256-bit SSL ile güvenli ödeme
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kart Üzerindeki İsim <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.cardName}
                      onChange={(e) => setFormData({ ...formData, cardName: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      placeholder="AD SOYAD"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kart Numarası <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '')
                          const formatted = value.match(/.{1,4}/g)?.join(' ') || value
                          setFormData({ ...formData, cardNumber: formatted })
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ay <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.expireMonth}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
                          setFormData({ ...formData, expireMonth: value })
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="MM"
                        maxLength={2}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yıl <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.expireYear}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                          setFormData({ ...formData, expireYear: value })
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="YYYY"
                        maxLength={4}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.cvc}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3)
                            setFormData({ ...formData, cvc: value })
                          }}
                          className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                          placeholder="123"
                          maxLength={3}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.termsAccepted}
                        onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                        className="mt-1 w-4 h-4"
                        required
                      />
                      <span className="text-sm text-gray-700">
                        <Link href="/kullanim-kosullari" className="text-black underline hover:no-underline" target="_blank">
                          Kullanım Koşulları
                        </Link>
                        {' '}ve{' '}
                        <Link href="/gizlilik" className="text-black underline hover:no-underline" target="_blank">
                          Gizlilik Politikası
                        </Link>
                        'nı okudum, kabul ediyorum. <span className="text-red-500">*</span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.kvkkAccepted}
                        onChange={(e) => setFormData({ ...formData, kvkkAccepted: e.target.checked })}
                        className="mt-1 w-4 h-4"
                        required
                      />
                      <span className="text-sm text-gray-700">
                        <Link href="/kvkk" className="text-black underline hover:no-underline" target="_blank">
                          KVKK Aydınlatma Metni
                        </Link>
                        'ni okudum, kişisel verilerimin işlenmesini kabul ediyorum. <span className="text-red-500">*</span>
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handlePreviousStep}
                      disabled={isProcessing}
                      className="flex-1 bg-gray-100 text-black py-4 rounded-lg font-medium hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Geri
                    </button>
                    <button
                      onClick={handlePayment}
                      disabled={isProcessing || !formData.termsAccepted || !formData.kvkkAccepted}
                      className="flex-1 bg-green-600 text-white py-4 rounded-lg font-medium hover:bg-green-700 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isProcessing ? 'İşleniyor...' : `₺${(total / 10).toFixed(2)} Öde`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary - Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 lg:sticky lg:top-24">
              <h3 className="text-lg font-bold text-black mb-4">Sipariş Özeti</h3>

              {/* Cart Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-black line-clamp-2">{item.name}</h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">Adet: {item.qty}</span>
                        <span className="text-sm font-medium text-black">
                          ₺{((item.price * item.qty) / 10).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
          </div>

          {/* Price Breakdown */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ara Toplam</span>
                  <span className="font-medium text-black">₺{(subtotal / 10).toFixed(2)}</span>
            </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Kargo ({formData.shippingMethod === 'express' ? 'Hızlı' : 'Standart'})
                  </span>
                  <span className={`font-medium ${shipping === 0 ? 'text-green-600' : 'text-black'}`}>
                    {shipping === 0 ? 'Ücretsiz' : `₺${(shipping / 10).toFixed(2)}`}
              </span>
            </div>
            
            {/* Free Shipping Progress */}
                {subtotal < FREE_SHIPPING_THRESHOLD && formData.shippingMethod === 'standard' && (
                  <div className="pt-2">
                    <div className="text-xs text-orange-600 mb-2">
                  Ücretsiz kargo için ₺{((FREE_SHIPPING_THRESHOLD - subtotal) / 10).toFixed(2)} daha ekleyin
                </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                        className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
                      />
                </div>
              </div>
            )}

                <div className="flex justify-between text-base font-bold text-black pt-3 border-t border-gray-200">
              <span>Toplam</span>
                  <span>₺{(total / 10).toFixed(2)}</span>
            </div>
          </div>

              {/* Security Icons */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    <span>Güvenli Ödeme</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    <span>SSL Korumalı</span>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
      </div>

      <Footer />
    </div>
  )
}
