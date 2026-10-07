'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductImage from '@/components/product-image'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, CreditCard, Truck, Shield } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { refreshCartPrices, setCart } from '@/lib/cart'
import { clearAppliedCouponCode, getAppliedCouponCode, setAppliedCouponCode } from '@/lib/coupon-storage'
import { formatTRY, toCartPrice, toDisplayPrice } from '@/lib/price'
import { calculateCheckoutTotals, FREE_SHIPPING_THRESHOLD_KURUS } from '@/lib/checkout-pricing'

// UI tipinde sepet öğesi
type UIItem = {
  id: string
  slug: string
  name: string
  brand?: string
  price: number
  originalPrice?: number
  image: string
  quantity: number
  color?: string
  size?: string
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<UIItem[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [removingItem, setRemovingItem] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [validatedCouponCode, setValidatedCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  // LocalStorage'dan sepet yükle ve API'den ürün bilgilerini al
  useEffect(() => {
    const loadCartItems = async () => {
      try {
        const local = await refreshCartPrices()
        const response = await fetch('/api/products')
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error('Product details unavailable')
        {
          const products = result.data || []
          const ui: UIItem[] = local.map(l => {
            const p = products.find((x: any) => x.slug === l.slug) || {}
            return {
              id: l.id,
              slug: l.slug,
              name: l.name,
              brand: (p as any).brand,
              price: l.price,
              originalPrice: p.original_price ? toCartPrice(Number(p.original_price)) : undefined,
              image: l.image,
              quantity: l.qty,
            }
          })
          setCartItems(ui)
          const storedCoupon = getAppliedCouponCode()
          if (storedCoupon) {
            setCouponCode(storedCoupon)
            await applyCoupon(storedCoupon)
          }
        }
      } catch (error) {
        console.error('Error loading cart items:', error)
        setPriceError('Güncel ürün fiyatları doğrulanamadı. Lütfen sayfayı yenileyin veya tekrar deneyin.')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadCartItems()
  }, [])

  // LocalStorage'a yaz (UI -> local format)
  const persist = (items: UIItem[]) => {
    setCart(items.map(i => ({ id: i.id, slug: i.slug, name: i.name, image: i.image, price: i.price, qty: i.quantity })))
  }

  // Sepet toplam hesaplama
  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  const discount = cartItems.reduce((total, item) => total + (Math.max(0, (item.originalPrice || 0) - item.price) * item.quantity), 0)
  const totals = calculateCheckoutTotals(subtotal, couponDiscount)
  const shipping = totals.shippingKurus
  const total = totals.totalKurus

  const applyCoupon = async (restoredCode?: string) => {
    const codeToApply = (restoredCode ?? couponCode).trim().toUpperCase()
    if (!codeToApply) {
      setCouponError('Lütfen kupon kodu girin')
      setCouponDiscount(0)
      setValidatedCouponCode('')
      clearAppliedCouponCode()
      return
    }

    try {
      setIsApplyingCoupon(true)
      setCouponError(null)
      const refreshed = await refreshCartPrices()
      setPriceError(null)
      setCartItems(items => items.map(item => {
        const current = refreshed.find(entry => entry.id === item.id)
        return current ? { ...item, price: current.price } : item
      }))
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: codeToApply,
          items: refreshed.map(item => ({ id: item.id, quantity: item.qty })),
        }),
      })
      const result = await response.json()
      if (!result.success) {
        setCouponDiscount(0)
        setValidatedCouponCode('')
        setCouponError(result.error || 'Kupon uygulanamadı')
        clearAppliedCouponCode()
        return
      }
      const refreshedSubtotal = refreshed.reduce((sum, item) => sum + item.price * item.qty, 0)
      if (result.data.subtotalKurus !== refreshedSubtotal) throw new Error('Basket quote changed during coupon validation')
      const amount = result.data.discountAmountKurus
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > refreshedSubtotal) throw new Error('Invalid coupon amount')
      setCouponDiscount(amount)
      setValidatedCouponCode(codeToApply)
      setAppliedCouponCode(codeToApply)
    } catch {
      setCouponDiscount(0)
      setValidatedCouponCode('')
      setCouponError('Kupon doğrulanırken hata oluştu')
      setPriceError('Güncel ürün fiyatları doğrulanamadı. Lütfen sayfayı yenileyin veya tekrar deneyin.')
      clearAppliedCouponCode()
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  // Miktar güncelleme
  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 99 || isApplyingCoupon || removingItem) return
    setCouponCode('')
    setCouponDiscount(0)
    setValidatedCouponCode('')
    clearAppliedCouponCode()
    
    setIsUpdating(true)
    setCartItems(items => {
      const next = items.map(item => item.id === id ? { ...item, quantity: newQuantity } : item)
      persist(next)
      return next
    })
    
    // Simüle edilmiş güncelleme gecikmesi
    setTimeout(() => setIsUpdating(false), 300)
  }

  // Ürün silme
  const removeItem = (id: string) => {
    if (isApplyingCoupon || removingItem) return
    setCouponCode('')
    setCouponDiscount(0)
    setValidatedCouponCode('')
    clearAppliedCouponCode()
    setRemovingItem(id)
    setTimeout(() => {
      setCartItems(items => {
        const next = items.filter(item => item.id !== id)
        persist(next)
        return next
      })
      setRemovingItem(null)
    }, 300)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Sepet yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  // Sepet boş mu kontrolü
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-12">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors duration-200 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Alışverişe Devam Et
            </Link>
            <h1 className="text-4xl font-light text-black">Sepetim</h1>
          </div>

          {/* Empty Cart */}
          <div className="text-center py-20 animate-fade-in-up">
            {priceError && <p className="mb-4 text-red-600">{priceError}</p>}
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-float">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-light text-black mb-4 animate-slide-in-up animation-delay-200">Sepetiniz Boş</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto animate-slide-in-up animation-delay-400">
              Favori ürünlerinizi sepete ekleyerek alışverişe başlayın
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-black hover:bg-gray-800 hover:scale-105 active:scale-95 text-white font-light text-lg transition-all duration-300 rounded-full animate-slide-in-up animation-delay-600 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Alışverişe Başla
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-24 pb-16">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12 animate-fade-in-up">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors duration-200 mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Alışverişe Devam Et
          </Link>
          <h1 className="text-4xl font-light text-black animate-slide-in-left">Sepetim</h1>
          <p className="text-gray-600 mt-2 animate-slide-in-left animation-delay-200">
            {cartItems.length} ürün • {cartItems.reduce((total, item) => total + item.quantity, 0)} adet
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {cartItems.map((item, index) => (
              <div 
                key={item.id} 
                className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md ${
                  removingItem === item.id ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100 scale-100 translate-x-0'
                } animate-fade-in-up`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex gap-4 lg:gap-6">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gray-100 rounded-xl overflow-hidden">
                      <ProductImage
                        src={item.image}
                        alt={item.name}
                        width={96}
                        height={96}
                        className="w-full h-full"
                        sizes="96px"
                      />
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-light text-black leading-tight mb-1">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">{item.brand}</p>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Renk: {item.color}</span>
                          <span>Boy: {item.size}</span>
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={isApplyingCoupon || !!removingItem}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price and Quantity */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        {item.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ₺{formatTRY(toDisplayPrice(item.originalPrice))}
                          </span>
                        )}
                        <span className="text-lg lg:text-xl font-light text-black">
                          ₺{formatTRY(toDisplayPrice(item.price))}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 self-start sm:self-auto">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={isUpdating || isApplyingCoupon || !!removingItem || item.quantity <= 1}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        
                        <span className="w-12 text-center font-light text-lg">
                          {item.quantity}
                        </span>
                        
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isUpdating || isApplyingCoupon || !!removingItem || item.quantity >= 99}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 transition-all duration-200 active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 lg:sticky lg:top-24 animate-slide-in-right animation-delay-300">
              <h2 className="text-xl font-light text-black mb-6">Sipariş Özeti</h2>
              
              {/* Price Breakdown */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="mb-2 block text-sm text-gray-700">Kupon Kodu</label>
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      disabled={isApplyingCoupon}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase())
                        setCouponDiscount(0)
                        setValidatedCouponCode('')
                        clearAppliedCouponCode()
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="KODUNUZU GİRİN"
                    />
                    <button
                      onClick={() => void applyCoupon()}
                      disabled={isApplyingCoupon || isUpdating || !!removingItem}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black disabled:opacity-60"
                    >
                      {isApplyingCoupon ? '...' : 'Uygula'}
                    </button>
                  </div>
              {priceError && <p className="mb-3 text-sm text-red-600">{priceError}</p>}
              {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
                  {couponDiscount > 0 && <p className="mt-2 text-xs text-green-600">Kupon indirimi uygulandı</p>}
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Ara Toplam</span>
                  <span>₺{formatTRY(toDisplayPrice(subtotal))}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Ürünlerde Tasarruf</span>
                    <span>-₺{formatTRY(toDisplayPrice(discount))}</span>
                  </div>
                )}

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Kupon İndirimi</span>
                    <span>-₺{formatTRY(toDisplayPrice(couponDiscount))}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-gray-600">
                  <span>Kargo</span>
                  <span className={shipping === 0 ? 'text-green-600' : ''}>
                    {shipping === 0 ? 'Ücretsiz' : `₺${formatTRY(toDisplayPrice(shipping))}`}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-xl font-light text-black">
                    <span>Toplam</span>
                    <span>₺{formatTRY(toDisplayPrice(total))}</span>
                  </div>
                </div>
              </div>

              {/* Free Shipping Progress */}
              {totals.subtotalAfterDiscountKurus < FREE_SHIPPING_THRESHOLD_KURUS && (
                <div className="mb-6 p-4 bg-orange-50 rounded-xl animate-pulse-slow">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-orange-600 animate-float" />
                    <span className="text-sm font-medium text-orange-800">
                      Ücretsiz Kargo İçin
                    </span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((totals.subtotalAfterDiscountKurus / FREE_SHIPPING_THRESHOLD_KURUS) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-orange-700">
                    ₺{formatTRY(toDisplayPrice(FREE_SHIPPING_THRESHOLD_KURUS - totals.subtotalAfterDiscountKurus))} daha ekleyin
                  </p>
                </div>
              )}

              {/* Checkout Button */}
              <Link
                href="/checkout"
                aria-disabled={!!priceError || cartItems.length === 0}
                onClick={(event) => { if (priceError) event.preventDefault() }}
                className="w-full bg-black hover:bg-gray-800 hover:scale-105 active:scale-95 text-white font-light text-lg py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mb-4 group"
              >
                <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                Güvenli Ödeme
              </Link>

              {/* Security Info */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-semibold text-blue-900">iyzico</span>
                  <span className="text-xs text-blue-700">ile güvenli ödeme</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                  <Shield className="w-3 h-3" />
                  <span>256-bit SSL ile korunuyor</span>
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
