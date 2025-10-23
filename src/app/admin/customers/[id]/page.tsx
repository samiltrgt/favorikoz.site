'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Mail, Phone, Calendar, ShoppingBag, TrendingUp, Package, CreditCard } from 'lucide-react'

interface Customer {
  id: string
  email: string
  name: string
  phone: string
  role: string
  created_at: string
  updated_at: string
}

interface CustomerStats {
  totalOrders: number
  totalSpent: number
  pendingOrders: number
  completedOrders: number
  averageOrderValue: number
}

interface Order {
  id: string
  order_number: string
  total: number
  status: string
  created_at: string
  shipping_address: any
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Bekliyor' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'İşleniyor' },
      shipped: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Kargoda' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Tamamlandı' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'İptal' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  useEffect(() => {
    loadCustomerDetails()
  }, [customerId])

  const loadCustomerDetails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/customers/${customerId}`)
      const result = await res.json()

      if (result.success) {
        setCustomer(result.data.customer)
        setStats(result.data.stats)
        setOrders(result.data.orders)
      } else {
        alert('Müşteri bulunamadı')
        router.push('/admin/customers')
      }
    } catch (error) {
      console.error('Failed to load customer details:', error)
      alert('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-600 mt-4">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!customer || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Müşteri bulunamadı</p>
          <button
            onClick={() => router.push('/admin/customers')}
            className="mt-4 text-black hover:text-gray-600"
          >
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/admin/customers')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Müşterilere Dön
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-medium">
                  {customer.name?.charAt(0).toUpperCase() || 'M'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-light text-gray-900">
                  {customer.name || 'İsimsiz Müşteri'}
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    {customer.email}
                  </span>
                  {customer.phone && (
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      {customer.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Orders */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Sipariş</p>
                <p className="text-2xl font-light text-gray-900 mt-1">
                  {stats.totalOrders}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Spent */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Harcama</p>
                <p className="text-2xl font-light text-gray-900 mt-1">
                  ₺{stats.totalSpent.toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Average Order Value */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ortalama Sepet</p>
                <p className="text-2xl font-light text-gray-900 mt-1">
                  ₺{stats.averageOrderValue.toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bekleyen</p>
                <p className="text-2xl font-light text-gray-900 mt-1">
                  {stats.pendingOrders}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.completedOrders} tamamlandı
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-light text-gray-900 mb-4">Müşteri Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{customer.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Telefon</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{customer.phone || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Kayıt Tarihi</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(customer.created_at)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Son Güncelleme</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(customer.updated_at)}</p>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-light text-gray-900">Siparişler ({orders.length})</h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">Henüz sipariş yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sipariş No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tutar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teslimat Adresi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(order.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          ₺{order.total.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.shipping_address?.name || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.shipping_address?.city || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

