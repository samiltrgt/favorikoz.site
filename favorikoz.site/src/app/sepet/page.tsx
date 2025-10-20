'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, CreditCard, Truck, Shield } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { getCart, setCart } from '@/lib/cart'

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

  // LocalStorage'dan sepet yükle ve API'den ürün bilgilerini al
  useEffect(() => {
    const loadCartItems = async () => {
      try {
        const local = getCart()
        const response = await fetch('/api/products')
        const result = await response.json()
        
        if (result.success) {
          const products = result.data || []
          const ui: UIItem[] = local.map(l => {
            const p = products.find((x: any) => x.slug === l.slug) || {}
            return {
              id: l.id,
              slug: l.slug,
              name: l.name,
              brand: (p as any).brand,
              price: l.price, // Fiyat zaten doğru formatta
              originalPrice: (p as any).originalPrice ? (p as any).originalPrice : undefined, // Orijinal fiyat zaten doğru formatta
              image: l.image,
              quantity: l.qty,
            }
          })
          setCartItems(ui)
        }
      } catch (error) {
        console.error('Error loading cart items:', error)
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
  const discount = cartItems.reduce((total, item) => {
    if (item.originalPrice) {
      return total + ((item.originalPrice - item.price) * item.quantity)
    }
    return total
  }, 0)
  const shipping = subtotal >= 200 ? 0 : 5.00
  const total = subtotal - discount + shipping

  // Miktar güncelleme
  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return
    
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
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
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
                            ₺{(item.originalPrice / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                        <span className="text-lg lg:text-xl font-light text-black">
                          ₺{(item.price / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 self-start sm:self-auto">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={isUpdating || item.quantity <= 1}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        
                        <span className="w-12 text-center font-light text-lg">
                          {item.quantity}
                        </span>
                        
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isUpdating}
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
                <div className="flex justify-between text-gray-600">
                  <span>Ara Toplam</span>
                  <span>₺{(subtotal / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>İndirim</span>
                    <span>-₺{(discount / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-gray-600">
                  <span>Kargo</span>
                  <span className={shipping === 0 ? 'text-green-600' : ''}>
                    {shipping === 0 ? 'Ücretsiz' : `₺${shipping.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-xl font-light text-black">
                    <span>Toplam</span>
                    <span>₺{(total / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Free Shipping Progress */}
              {subtotal < 200 && (
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
                      style={{ width: `${(subtotal / 200) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-orange-700">
                    ₺{(200 - subtotal).toFixed(2)} daha ekleyin
                  </p>
                </div>
              )}

              {/* Checkout Button */}
              <Link
                href="/checkout"
                className="w-full bg-black hover:bg-gray-800 hover:scale-105 active:scale-95 text-white font-light text-lg py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mb-4 group"
              >
                <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                Güvenli Ödeme
              </Link>

              {/* Security Info */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4" />
                <span>256-bit SSL ile korunuyor</span>
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
