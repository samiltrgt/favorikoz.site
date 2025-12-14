'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Truck, CheckCircle, XCircle, Clock, ChevronRight, Search, Filter } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: any
  items: any[]
  subtotal: number
  shipping_cost: number
  total: number
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'completed' | 'failed'
  payment_method: string
  created_at: string
  updated_at: string
}

const statusConfig = {
  pending: {
    label: 'Beklemede',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800',
    borderColor: 'border-yellow-200'
  },
  paid: {
    label: 'Ödeme Alındı',
    icon: CheckCircle,
    color: 'bg-blue-100 text-blue-800',
    borderColor: 'border-blue-200'
  },
  shipped: {
    label: 'Kargoya Verildi',
    icon: Truck,
    color: 'bg-purple-100 text-purple-800',
    borderColor: 'border-purple-200'
  },
  completed: {
    label: 'Teslim Edildi',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    borderColor: 'border-green-200'
  },
  cancelled: {
    label: 'İptal Edildi',
    icon: XCircle,
    color: 'bg-red-100 text-red-800',
    borderColor: 'border-red-200'
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter])

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/orders/my-orders')
      const result = await response.json()

      if (result.success) {
        setOrders(result.data || [])
      } else {
        if (response.status === 401) {
          router.push('/giris')
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return (price / 100).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container py-12">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container py-8 md:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-black mb-2">Siparişlerim</h1>
          <p className="text-gray-600">Tüm siparişlerinizi görüntüleyin ve takip edin</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Sipariş numarası veya isim ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
              >
                <option value="all">Tüm Siparişler</option>
                <option value="pending">Beklemede</option>
                <option value="paid">Ödeme Alındı</option>
                <option value="shipped">Kargoya Verildi</option>
                <option value="completed">Teslim Edildi</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {orders.length === 0 ? 'Henüz siparişiniz bulunmuyor' : 'Sipariş bulunamadı'}
            </h3>
            <p className="text-gray-500 mb-6">
              {orders.length === 0
                ? 'İlk siparişinizi verin ve takip edin'
                : 'Arama kriterlerinize uygun sipariş bulunamadı'}
            </p>
            {orders.length === 0 && (
              <Link
                href="/tum-urunler"
                className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Alışverişe Başla
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = statusConfig[order.status]
              const StatusIcon = statusInfo.icon

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  <div className="p-6">
                    {/* Order Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${statusInfo.color}`}>
                          <StatusIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Sipariş #{order.order_number}
                          </h3>
                          <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500 mb-1">Toplam Tutar</p>
                          <p className="text-xl font-semibold text-gray-900">
                            ₺{formatPrice(order.total)}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Order Items Summary */}
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">{order.items?.length || 0}</span> ürün
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {order.items?.slice(0, 3).map((item: any, index: number) => (
                          <div
                            key={index}
                            className="text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded"
                          >
                            {item.name} x {item.quantity}
                          </div>
                        ))}
                        {order.items?.length > 3 && (
                          <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded">
                            +{order.items.length - 3} daha
                          </div>
                        )}
                      </div>

                      {/* Shipping Address */}
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Teslimat Adresi:</span>{' '}
                        {order.shipping_address?.address}, {order.shipping_address?.city}
                      </div>
                    </div>

                    {/* Order Details Button */}
                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center gap-2 text-sm font-medium text-black hover:text-gray-600 transition-colors"
                      >
                        Sipariş Detaylarını Gör
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-light text-gray-900">
                    Sipariş #{selectedOrder.order_number}
                  </h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Sipariş Durumu</h3>
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                      statusConfig[selectedOrder.status].color
                    }`}
                  >
                    {React.createElement(statusConfig[selectedOrder.status].icon, {
                      className: 'w-5 h-5'
                    })}
                    {statusConfig[selectedOrder.status].label}
                  </span>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Ürünler</h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">Adet: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            ₺{formatPrice(item.price * item.quantity)}
                          </p>
                          <p className="text-sm text-gray-500">
                            ₺{formatPrice(item.price)} / adet
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Ara Toplam</span>
                      <span>₺{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Kargo</span>
                      <span>₺{formatPrice(selectedOrder.shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Toplam</span>
                      <span>₺{formatPrice(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Teslimat Adresi</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{selectedOrder.customer_name}</p>
                      <p>{selectedOrder.shipping_address?.address}</p>
                      <p>
                        {selectedOrder.shipping_address?.city},{' '}
                        {selectedOrder.shipping_address?.postalCode}
                      </p>
                      <p>{selectedOrder.customer_phone}</p>
                    </div>
                  </div>

                  {selectedOrder.billing_address && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Fatura Adresi</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>{selectedOrder.billing_address.name}</p>
                        <p>{selectedOrder.billing_address.address}</p>
                        <p>
                          {selectedOrder.billing_address.city},{' '}
                          {selectedOrder.billing_address.postalCode}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Info */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Ödeme Bilgileri</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Ödeme Yöntemi: {selectedOrder.payment_method}</p>
                    <p>
                      Ödeme Durumu:{' '}
                      <span
                        className={`font-medium ${
                          selectedOrder.payment_status === 'completed'
                            ? 'text-green-600'
                            : selectedOrder.payment_status === 'failed'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {selectedOrder.payment_status === 'completed'
                          ? 'Tamamlandı'
                          : selectedOrder.payment_status === 'failed'
                          ? 'Başarısız'
                          : 'Beklemede'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Dates */}
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Sipariş Tarihi: {formatDate(selectedOrder.created_at)}</p>
                  <p>Son Güncelleme: {formatDate(selectedOrder.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

