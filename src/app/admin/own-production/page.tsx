'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import AdminProductPicker, { type PickerProduct } from '@/components/admin-product-picker'

interface FontenayForm {
  title: string
  subtitle: string
  href: string
  cta: string
  products: PickerProduct[]
}

export default function OwnProductionAdminPage() {
  const [form, setForm] = useState<FontenayForm | null>(null)
  const [catalog, setCatalog] = useState<PickerProduct[]>([])
  const [legacyProducts, setLegacyProducts] = useState<PickerProduct[]>([])
  const [usingAutomatic, setUsingAutomatic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const [layoutRes, productsRes, ownRes] = await Promise.all([
        fetch('/api/admin/home-layout', { cache: 'no-store' }),
        fetch('/api/products?scope=admin', { cache: 'no-store' }),
        fetch('/api/own-production', { cache: 'no-store' }),
      ])
      const layout = await layoutRes.json()
      const products = await productsRes.json()
      const own = await ownRes.json()

      if (products.success) setCatalog(products.data || [])

      const fromLegacy: PickerProduct[] = []
      if (own.success) {
        for (const row of own.data || []) {
          const product = row.products
          if (!product?.id) continue
          fromLegacy.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
            image: product.image,
          })
        }
      }
      setLegacyProducts(fromLegacy)

      if (layout.success) {
        const fontenay = layout.data.fontenay
        const curated = (fontenay.products || []) as PickerProduct[]
        const hasCurated = Boolean(fontenay.productIds?.length)
        setUsingAutomatic(!hasCurated)
        setForm({
          title: fontenay.title,
          subtitle: fontenay.subtitle,
          href: fontenay.href,
          cta: fontenay.cta,
          products: hasCurated ? curated : fromLegacy,
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
          fontenay: {
            title: form.title,
            subtitle: form.subtitle,
            href: form.href,
            cta: form.cta,
            productIds: products.map((product) => product.id),
          },
        }),
      })
      const result = await response.json()
      if (!result.success) {
        setMessage(result.error || 'Kaydedilemedi')
        return
      }
      setUsingAutomatic(!result.data.fontenay.productIds?.length)
      setForm({
        title: result.data.fontenay.title,
        subtitle: result.data.fontenay.subtitle,
        href: result.data.fontenay.href,
        cta: result.data.fontenay.cta,
        products: result.data.fontenay.products || [],
      })
      setMessage('Ana sayfadaki Fontenay Paris bölümü güncellendi.')
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
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Fontenay Paris</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ana sayfanın en altındaki “ürettiğimiz ürünler” şeridi — Öne Çıkanlar ve kategori satırlarıyla aynı kontrol.
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
            value={form.cta}
            onChange={(event) => setForm({ ...form, cta: event.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm text-gray-700 md:col-span-2">
          Alt başlık
          <input
            value={form.subtitle}
            onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
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
          <p>
            Özel ürün listesi yok. Ana sayfa şu an{' '}
            {legacyProducts.length > 0
              ? 'eski Fontenay listesindeki ürünleri'
              : 'Fontenay markalı ürünleri (yoksa son ürünleri)'}{' '}
            gösteriyor.
          </p>
          {legacyProducts.length > 0 && (
            <button
              type="button"
              className="mt-2 font-medium underline"
              onClick={() => {
                setForm({ ...form, products: legacyProducts })
                setUsingAutomatic(false)
              }}
            >
              Bu ürünleri listeye al ve düzenle
            </button>
          )}
        </div>
      )}

      <AdminProductPicker
        title="Ürünler"
        description="Kaydettikten sonra ana sayfa yalnızca bu listedeki ürünleri gösterir."
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
