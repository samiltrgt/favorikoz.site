'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, Package, Truck, CheckCircle, XCircle, Clock, Eye, Edit2, X, Printer } from 'lucide-react'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: any
  billing_address?: any
  items: any[]
  subtotal: number
  shipping_cost: number
  total: number
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'completed' | 'failed'
  payment_method: string
  created_at: string
  updated_at: string
  tracking_number?: string | null
  carrier?: string | null
}

const statusConfig = {
  pending: { label: 'Beklemede', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Ödeme Alındı', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Kargoya Verildi', icon: Truck, color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Teslim Edildi', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'İptal Edildi', icon: XCircle, color: 'bg-red-100 text-red-800' }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [editPaymentStatus, setEditPaymentStatus] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter])

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders')
      const result = await response.json()

      if (result.success) {
        setOrders(result.data || [])
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          payment_status: editPaymentStatus,
          tracking_number: (editTrackingNumber ?? '').trim() || null,
          carrier: 'surat'
        })
      })

      const result = await response.json()

      if (result.success) {
        setOrders(orders.map(o => o.id === selectedOrder.id ? result.data : o))
        setSelectedOrder(result.data)
        setIsEditingStatus(false)
        alert('Sipariş durumu güncellendi')
      } else {
        alert('Hata: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Sipariş güncellenirken bir hata oluştu')
    }
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

  const getStatusStats = () => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      paid: orders.filter(o => o.status === 'paid').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Siparişler yükleniyor...</p>
        </div>
      </div>
    )
  }

  const stats = getStatusStats()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-light text-gray-900">Siparişler</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toplam {stats.total} sipariş
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Toplam</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200">
            <p className="text-sm text-yellow-700">Beklemede</p>
            <p className="text-2xl font-semibold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
            <p className="text-sm text-blue-700">Ödeme Alındı</p>
            <p className="text-2xl font-semibold text-blue-900">{stats.paid}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-200">
            <p className="text-sm text-purple-700">Kargoda</p>
            <p className="text-2xl font-semibold text-purple-900">{stats.shipped}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
            <p className="text-sm text-green-700">Teslim Edildi</p>
            <p className="text-2xl font-semibold text-green-900">{stats.completed}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
            <p className="text-sm text-red-700">İptal</p>
            <p className="text-2xl font-semibold text-red-900">{stats.cancelled}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Sipariş numarası, müşteri adı veya email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="pending">Beklemede</option>
                <option value="paid">Ödeme Alındı</option>
                <option value="shipped">Kargoya Verildi</option>
                <option value="completed">Teslim Edildi</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {orders.length === 0 ? 'Henüz sipariş yok' : 'Sipariş bulunamadı'}
            </h3>
            <p className="text-gray-500">
              {orders.length === 0
                ? 'İlk sipariş geldiğinde burada görünecek'
                : 'Arama kriterlerinize uygun sipariş bulunamadı'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sipariş
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Müşteri
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ürünler
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tutar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => {
                    const statusInfo = statusConfig[order.status]
                    const StatusIcon = statusInfo.icon

                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            #{order.order_number}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{order.customer_name}</div>
                          <div className="text-sm text-gray-500">{order.customer_email}</div>
                          <div className="text-sm text-gray-500">{order.customer_phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.items?.length || 0} ürün</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ₺{formatPrice(order.total)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedOrder(order)
                              setEditStatus(order.status)
                              setEditPaymentStatus(order.payment_status)
                              setEditTrackingNumber(order.tracking_number || '')
                              setEditPaymentStatus(order.payment_status)
                            }}
                            className="text-black hover:text-gray-600 inline-flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Detay
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setSelectedOrder(null)
              setIsEditingStatus(false)
            }}
          >
            <div
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-2xl font-light text-gray-900">
                  Sipariş #{selectedOrder.order_number}
                </h2>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/orders/${selectedOrder.id}/shipping-label`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Sürat etiketi yazdır
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedOrder(null)
                      setIsEditingStatus(false)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Sipariş Durumu</h3>
                    {!isEditingStatus ? (
                      <button
                        onClick={() => {
                          setEditStatus(selectedOrder.status)
                          setEditPaymentStatus(selectedOrder.payment_status)
                          setEditTrackingNumber(selectedOrder.tracking_number || '')
                          setIsEditingStatus(true)
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        Düzenle
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateStatus}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingStatus(false)
                            setEditStatus(selectedOrder.status)
                            setEditPaymentStatus(selectedOrder.payment_status)
                            setEditTrackingNumber(selectedOrder.tracking_number || '')
                          }}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          İptal
                        </button>
                      </div>
                    )}
                  </div>

                  {!isEditingStatus ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Sipariş Durumu:</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[selectedOrder.status].color}`}>
                          {React.createElement(statusConfig[selectedOrder.status].icon, { className: 'w-4 h-4' })}
                          {statusConfig[selectedOrder.status].label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Ödeme Durumu:</span>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedOrder.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                          selectedOrder.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedOrder.payment_status === 'completed' ? 'Tamamlandı' :
                           selectedOrder.payment_status === 'failed' ? 'Başarısız' : 'Beklemede'}
                        </span>
                      </div>
                      {selectedOrder.tracking_number && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Kargo Takip No:</span>
                          <span className="font-mono text-sm text-gray-900">{selectedOrder.tracking_number}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sipariş Durumu
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        >
                          <option value="pending">Beklemede</option>
                          <option value="paid">Ödeme Alındı</option>
                          <option value="shipped">Kargoya Verildi</option>
                          <option value="completed">Teslim Edildi</option>
                          <option value="cancelled">İptal Edildi</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ödeme Durumu
                        </label>
                        <select
                          value={editPaymentStatus}
                          onChange={(e) => setEditPaymentStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        >
                          <option value="pending">Beklemede</option>
                          <option value="completed">Tamamlandı</option>
                          <option value="failed">Başarısız</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kargo Takip Numarası (Sürat Kargo)
                        </label>
                        <input
                          type="text"
                          value={editTrackingNumber}
                          onChange={(e) => setEditTrackingNumber(e.target.value)}
                          placeholder="Örn. 1234567890"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Info */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Müşteri Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Ad Soyad</p>
                      <p className="font-medium text-gray-900">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">E-posta</p>
                      <p className="font-medium text-gray-900">{selectedOrder.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Telefon</p>
                      <p className="font-medium text-gray-900">{selectedOrder.customer_phone}</p>
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Teslimat Adresi</h3>
                    <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
                      <p>{selectedOrder.shipping_address?.address}</p>
                      <p>{selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.postalCode}</p>
                    </div>
                  </div>

                  {selectedOrder.billing_address && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Fatura Adresi</h3>
                      <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
                        <p>{selectedOrder.billing_address.address}</p>
                        <p>{selectedOrder.billing_address.city}, {selectedOrder.billing_address.postalCode}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Ürünler</h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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

                {/* Dates */}
                <div className="text-sm text-gray-500 space-y-1 bg-gray-50 p-3 rounded-lg">
                  <p>Sipariş Tarihi: {formatDate(selectedOrder.created_at)}</p>
                  <p>Son Güncelleme: {formatDate(selectedOrder.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

