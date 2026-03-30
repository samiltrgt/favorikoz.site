'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Edit, Plus, Save, Ticket, Trash2, X } from 'lucide-react'

type Coupon = {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  valid_from: string | null
  valid_until: string | null
  max_total_uses: number | null
  max_uses_per_customer: number | null
  is_active: boolean
  created_at: string
}

type FormData = {
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: string
  validFrom: string
  validUntil: string
  maxTotalUses: string
  maxUsesPerCustomer: string
  isActive: boolean
}

const DEFAULT_FORM: FormData = {
  code: '',
  discountType: 'percent',
  discountValue: '',
  validFrom: '',
  validUntil: '',
  maxTotalUses: '',
  maxUsesPerCustomer: '',
  isActive: true,
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadCoupons()
  }, [])

  const loadCoupons = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/coupons')
      const result = await response.json()
      if (result.success) {
        setCoupons(result.data || [])
      } else {
        setError(result.error || 'Kuponlar yüklenemedi')
      }
    } catch {
      setError('Kuponlar yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreate = () => {
    setEditingCoupon(null)
    setFormData(DEFAULT_FORM)
    setError(null)
    setSuccess(null)
    setIsModalOpen(true)
  }

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: String(coupon.discount_value),
      validFrom: coupon.valid_from ? coupon.valid_from.slice(0, 16) : '',
      validUntil: coupon.valid_until ? coupon.valid_until.slice(0, 16) : '',
      maxTotalUses: coupon.max_total_uses ? String(coupon.max_total_uses) : '',
      maxUsesPerCustomer: coupon.max_uses_per_customer ? String(coupon.max_uses_per_customer) : '',
      isActive: coupon.is_active,
    })
    setError(null)
    setSuccess(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCoupon(null)
    setFormData(DEFAULT_FORM)
  }

  const saveCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const payload = {
      code: formData.code,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
      validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
      maxTotalUses: formData.maxTotalUses ? Number(formData.maxTotalUses) : null,
      maxUsesPerCustomer: formData.maxUsesPerCustomer ? Number(formData.maxUsesPerCustomer) : null,
      isActive: formData.isActive,
    }

    const url = editingCoupon ? `/api/admin/coupons/${editingCoupon.id}` : '/api/admin/coupons'
    const method = editingCoupon ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!result.success) {
        setError(result.error || 'Kupon kaydedilemedi')
        return
      }

      setSuccess(editingCoupon ? 'Kupon güncellendi' : 'Kupon oluşturuldu')
      await loadCoupons()
      closeModal()
    } catch {
      setError('Kupon kaydedilemedi')
    }
  }

  const deleteCoupon = async (coupon: Coupon) => {
    if (!confirm(`${coupon.code} kuponunu silmek istediğinize emin misiniz?`)) return

    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!result.success) {
        setError(result.error || 'Kupon silinemedi')
        return
      }
      setSuccess('Kupon silindi')
      await loadCoupons()
    } catch {
      setError('Kupon silinemedi')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kupon Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">Yüzdelik veya sabit tutarlı indirim kuponları oluşturun</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Yeni Kupon
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          <AlertCircle className="h-5 w-5" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="divide-y divide-gray-200">
          {coupons.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Henüz kupon oluşturulmamış.</div>
          ) : (
            coupons.map((coupon) => (
              <div key={coupon.id} className="flex items-center justify-between px-4 py-4 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                    <Ticket className="h-4 w-4" />
                    {coupon.code}
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {coupon.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {coupon.discount_type === 'percent' ? `%${coupon.discount_value}` : `₺${coupon.discount_value}`} indirim
                    {' • '}
                    Toplam limit: {coupon.max_total_uses ?? 'Yok'}
                    {' • '}
                    Müşteri limiti: {coupon.max_uses_per_customer ?? 'Yok'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Geçerlilik: {coupon.valid_from ? new Date(coupon.valid_from).toLocaleString('tr-TR') : '-'} /{' '}
                    {coupon.valid_until ? new Date(coupon.valid_until).toLocaleString('tr-TR') : '-'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(coupon)}
                    className="rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50"
                    title="Düzenle"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteCoupon(coupon)}
                    className="rounded-md p-2 text-red-600 transition-colors hover:bg-red-50"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={closeModal} />
            <div className="relative w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
              <form onSubmit={saveCoupon}>
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{editingCoupon ? 'Kupon Düzenle' : 'Yeni Kupon'}</h3>
                    <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm text-gray-700">Kupon Kodu *</span>
                      <input
                        required
                        value={formData.code}
                        onChange={(e) => setFormData((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-gray-700">İndirim Tipi *</span>
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData((s) => ({ ...s, discountType: e.target.value as 'percent' | 'fixed' }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="percent">Yüzde</option>
                        <option value="fixed">Sabit Tutar (TL)</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-sm text-gray-700">İndirim Değeri *</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discountValue}
                      onChange={(e) => setFormData((s) => ({ ...s, discountValue: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm text-gray-700">Geçerlilik Başlangıcı</span>
                      <input
                        type="datetime-local"
                        value={formData.validFrom}
                        onChange={(e) => setFormData((s) => ({ ...s, validFrom: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-gray-700">Geçerlilik Bitişi</span>
                      <input
                        type="datetime-local"
                        value={formData.validUntil}
                        onChange={(e) => setFormData((s) => ({ ...s, validUntil: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm text-gray-700">Toplam Kullanım Limiti</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.maxTotalUses}
                        onChange={(e) => setFormData((s) => ({ ...s, maxTotalUses: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-gray-700">Müşteri Başı Limit</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.maxUsesPerCustomer}
                        onChange={(e) => setFormData((s) => ({ ...s, maxUsesPerCustomer: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((s) => ({ ...s, isActive: e.target.checked }))}
                    />
                    Kupon aktif olsun
                  </label>
                </div>

                <div className="flex justify-end gap-3 bg-gray-50 px-6 py-3">
                  <button type="button" onClick={closeModal} className="rounded-md border border-gray-300 px-4 py-2">
                    İptal
                  </button>
                  <button type="submit" className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white">
                    <Save className="mr-2 h-4 w-4" />
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
