'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Phone, Package, LogOut, Edit2, Save } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })

  useEffect(() => {
    loadUser()
    loadOrders()
  }, [])

  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const result = await response.json()

      if (result.success) {
        setUser(result.user)
        setFormData({
          name: result.user.name || '',
          phone: result.user.phone || '',
        })
      } else {
        router.push('/giris')
      }
    } catch (error) {
      console.error('Error loading user:', error)
      router.push('/giris')
    } finally {
      setIsLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/orders/my-orders')
      const result = await response.json()
      if (result.success) {
        setOrders(result.data || [])
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        alert('Bilgileriniz güncellendi!')
        setUser({ ...user, ...formData })
        setIsEditing(false)
      } else {
        alert('Hata: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Bilgiler güncellenirken hata oluştu.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    if (!confirm('Çıkış yapmak istediğinize emin misiniz?')) return

    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      window.dispatchEvent(new Event('authChanged'))
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-24 pb-16">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Yükleniyor...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Hesabım</h1>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Çıkış Yap
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Profile Info */}
            <div className="md:col-span-2 bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Profil Bilgileri</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-gray-600 hover:text-black"
                  >
                    <Edit2 className="w-4 h-4" />
                    Düzenle
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad Soyad
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-gray-900">
                      <User className="w-5 h-5 text-gray-400" />
                      {user?.name || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-posta
                  </label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="w-5 h-5 text-gray-400" />
                    {user?.email}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-gray-900">
                      <Phone className="w-5 h-5 text-gray-400" />
                      {user?.phone || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>

                {/* Save/Cancel Buttons */}
                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setFormData({
                          name: user?.name || '',
                          phone: user?.phone || '',
                        })
                      }}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      İptal
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-6 h-6 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900">Siparişlerim</h3>
                </div>
                <p className="text-3xl font-bold text-black">{orders.length}</p>
                <Link
                  href="/siparislerim"
                  className="block mt-4 text-sm text-black hover:underline"
                >
                  Tümünü Gör →
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="mt-8 bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Son Siparişlerim</h2>
            
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Henüz siparişiniz bulunmuyor.</p>
                <Link
                  href="/tum-urunler"
                  className="inline-block mt-4 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                >
                  Alışverişe Başla
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-900">Sipariş #{order.order_number}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₺{(order.total / 100).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

