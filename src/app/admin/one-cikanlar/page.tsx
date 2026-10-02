'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import AdminProductPicker, { type PickerProduct } from '@/components/admin-product-picker'

interface FeaturedForm {
  title: string
  description: string
  ctaLabel: string
  href: string
  products: PickerProduct[]
}

export default function OneCikanlarPage() {
  const [form, setForm] = useState<FeaturedForm | null>(null)
  const [catalog, setCatalog] = useState<PickerProduct[]>([])
  const [automatic, setAutomatic] = useState<PickerProduct[]>([])
  const [usingAutomatic, setUsingAutomatic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const [layoutRes, productsRes, promoRes] = await Promise.all([
        fetch('/api/admin/home-layout', { cache: 'no-store' }),
        fetch('/api/products?scope=admin', { cache: 'no-store' }),
        fetch('/api/promo-banner-products?scope=admin', { cache: 'no-store' }),
      ])
      const layout = await layoutRes.json()
      const products = await productsRes.json()
      const promo = await promoRes.json()
      if (products.success) setCatalog(products.data || [])
      if (promo.success) {
        const seen = new Set<string>()
        const list: PickerProduct[] = []
        for (const row of promo.data || []) {
          const product = row.products
          if (!product?.id || seen.has(product.id)) continue
          seen.add(product.id)
          list.push(product)
          if (list.length >= 5) break
        }
        setAutomatic(list)
      }
      if (layout.success) {
        const featured = layout.data.featured
        setUsingAutomatic(!featured.productIds?.length)
        setForm({
          title: featured.title,
          description: featured.description,
          ctaLabel: featured.ctaLabel,
          href: featured.href,
          products: featured.products || [],
        })
      }
    }
    load().catch((error) => console.error(error))
  }, [])

  const save = async (products: PickerProduct[]) => {
    if (!form) return
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/home-layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featured: {
            title: form.title,
            description: form.description,
            ctaLabel: form.ctaLabel,
            href: form.href,
            productIds: products.map((product) => product.id),
          },
        }),
      })
      const result = await response.json()
      if (!result.success) {
        setMessage(result.error || 'Kaydedilemedi')
        return
      }
      setUsingAutomatic(!result.data.featured.productIds?.length)
      setForm({
        title: result.data.featured.title,
        description: result.data.featured.description,
        ctaLabel: result.data.featured.ctaLabel,
        href: result.data.featured.href,
        products: result.data.featured.products || [],
      })
      setMessage('Ana sayfadaki Öne Çıkanlar güncellendi.')
    } catch (error) {
      console.error(error)
      setMessage('Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="mb-3 inline-flex items-center text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Admin Paneli
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Öne Çıkanlar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kampanya sliderının altındaki renkli panel ve yanındaki ürünler.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-2">
        <label className="block text-sm text-gray-700">
          Başlık
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm text-gray-700">
          Buton yazısı
          <input
            value={form.ctaLabel}
            onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm text-gray-700 md:col-span-2">
          Açıklama
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm text-gray-700 md:col-span-2">
          Buton linki
          <input
            value={form.href}
            onChange={(event) => setForm({ ...form, href: event.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="/tum-urunler"
          />
        </label>
      </div>

      {usingAutomatic && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>Özel ürün listesi yok. Ana sayfa şu an kayıtlı promo ürünlerinin ilk 5 tanesini gösteriyor.</p>
          {automatic.length > 0 && (
            <button
              type="button"
              className="mt-2 font-medium underline"
              onClick={() => {
                setForm({ ...form, products: automatic })
                setUsingAutomatic(false)
              }}
            >
              Bu 5 ürünü listeye al ve düzenle
            </button>
          )}
        </div>
      )}

      <AdminProductPicker
        title="Ürünler"
        description="Boş bırakıp kaydederseniz ana sayfa yeniden promo ürünlerine döner."
        selected={form.products}
        catalog={catalog}
        onChange={(products) => {
          setUsingAutomatic(false)
          setForm({ ...form, products })
        }}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => save(form.products)}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          Kaydet
        </button>
        {!usingAutomatic && (
          <button
            type="button"
            onClick={() => save([])}
            disabled={saving}
            className="text-sm text-gray-600 underline"
          >
            Özel listeyi kaldır
          </button>
        )}
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>
    </div>
  )
}
