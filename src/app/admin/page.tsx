'use client'

import { useState, useEffect } from 'react'
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp,
  Eye,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'
import Link from 'next/link'

// Mock data - gerçek uygulamada API'den gelecek
const mockStats = {
  totalProducts: 156,
  totalOrders: 1247,
  totalCustomers: 892,
  totalRevenue: 45678,
  recentOrders: [
    { id: 'ORD-001', customer: 'Ayşe Yılmaz', amount: 299, status: 'Tamamlandı', date: '2024-01-15' },
    { id: 'ORD-002', customer: 'Mehmet Demir', amount: 149, status: 'Kargoda', date: '2024-01-15' },
    { id: 'ORD-003', customer: 'Fatma Kaya', amount: 399, status: 'Beklemede', date: '2024-01-14' },
    { id: 'ORD-004', customer: 'Ali Özkan', amount: 199, status: 'Tamamlandı', date: '2024-01-14' },
  ],
  topProducts: [
    { id: 1, name: 'Premium Saç Fiberi', sales: 45, revenue: 13455 },
    { id: 2, name: 'Protez Tırnak Seti', sales: 38, revenue: 11400 },
    { id: 3, name: 'İpek Kirpik Kit', sales: 32, revenue: 9600 },
    { id: 4, name: 'Kalıcı Makyaj Kalemi', sales: 28, revenue: 8400 },
  ]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(mockStats)
  useEffect(() => {
    // Client-side guard fallback
    fetch('/api/admin/me', { method: 'HEAD' }).then(res => {
      if (!res.ok) {
        location.href = '/admin/login'
      }
    }).catch(() => {
      location.href = '/admin/login'
    })
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Favori Kozmetik yönetim paneline hoş geldiniz
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Ürün
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Toplam Ürün</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalProducts}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Toplam Sipariş</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalOrders}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Müşteri Sayısı</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalCustomers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Toplam Gelir</dt>
                  <dd className="text-lg font-medium text-gray-900">₺{stats.totalRevenue.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Son Siparişler</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {stats.recentOrders.map((order) => (
                  <li key={order.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.customer}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.id} • {order.date}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-medium text-gray-900">₺{order.amount}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'Tamamlandı' ? 'bg-green-100 text-green-800' :
                          order.status === 'Kargoda' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <Link
                href="/admin/orders"
                className="text-sm font-medium text-gray-900 hover:text-gray-700"
              >
                Tüm siparişleri görüntüle →
              </Link>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">En Çok Satan Ürünler</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {stats.topProducts.map((product) => (
                  <li key={product.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {product.sales} satış
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-medium text-gray-900">₺{product.revenue.toLocaleString()}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +12%
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <Link
                href="/admin/products"
                className="text-sm font-medium text-gray-900 hover:text-gray-700"
              >
                Tüm ürünleri görüntüle →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Hızlı İşlemler</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/admin/products/new"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500"
            >
              <div className="flex-shrink-0">
                <Plus className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Yeni Ürün Ekle</p>
                <p className="text-sm text-gray-500">Ürün kataloğuna yeni ürün ekleyin</p>
              </div>
            </Link>

            <Link
              href="/admin/banners"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500"
            >
              <div className="flex-shrink-0">
                <Edit className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Banner Düzenle</p>
                <p className="text-sm text-gray-500">Ana sayfa bannerlarını güncelleyin</p>
              </div>
            </Link>

            <Link
              href="/admin/orders"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500"
            >
              <div className="flex-shrink-0">
                <Eye className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Siparişleri Görüntüle</p>
                <p className="text-sm text-gray-500">Mevcut siparişleri yönetin</p>
              </div>
            </Link>

            <Link
              href="/admin/reports"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500"
            >
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Raporları İncele</p>
                <p className="text-sm text-gray-500">Satış raporlarını görüntüleyin</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
