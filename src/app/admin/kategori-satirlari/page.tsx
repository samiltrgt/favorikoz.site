'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import AdminProductPicker, { type PickerProduct } from '@/components/admin-product-picker'

interface RowForm {
  slug: string
  title: string
  products: PickerProduct[]
}

export default function KategoriSatirlariPage() {
  const [rows, setRows] = useState<RowForm[]>([])
  const [catalog, setCatalog] = useState<PickerProduct[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const [layoutRes, productsRes] = await Promise.all([
        fetch('/api/admin/home-layout', { cache: 'no-store' }),
        fetch('/api/products?scope=admin', { cache: 'no-store' }),
      ])
      const layout = await layoutRes.json()
      const products = await productsRes.json()
      if (products.success) setCatalog(products.data || [])
      if (layout.success) {
        setRows(
          (layout.data.rows || []).map((row: RowForm) => ({
            slug: row.slug,
            title: row.title,
            products: row.products || [],
          }))
        )
      }
    }
    load().catch((error) => console.error(error))
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/home-layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rows.map((row) => ({
            slug: row.slug,
            title: row.title,
            productIds: row.products.map((product) => product.id),
          })),
        }),
      })
      const result = await response.json()
      if (!result.success) {
        setMessage(result.error || 'Kaydedilemedi')
        return
      }
      setRows(
        (result.data.rows || []).map((row: RowForm) => ({
          slug: row.slug,
          title: row.title,
          products: row.products || [],
        }))
      )
      setMessage('Kategori satırları güncellendi.')
    } catch (error) {
      console.error(error)
      setMessage('Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="mb-3 inline-flex items-center text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Admin Paneli
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Kategori Satırları</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Ana sayfadaki Tırnak, İpek Kirpik ve Kişisel Bakım ürün satırları. Bir satır boşsa o kategorinin
            stoktaki güncel ürünleri otomatik gelir.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          Kaydet
        </button>
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}

      {rows.map((row, index) => (
        <div key={row.slug} className="space-y-3">
          <label className="block max-w-md text-sm text-gray-700">
            Satır başlığı
            <input
              value={row.title}
              onChange={(event) => {
                const next = [...rows]
                next[index] = { ...row, title: event.target.value }
                setRows(next)
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <AdminProductPicker
            title={row.title || row.slug}
            description="Seçili ürün yoksa kategori otomatik dolar. Sıra, yukarı ve aşağı ile değişir."
            selected={row.products}
            catalog={catalog}
            onChange={(products) => {
              const next = [...rows]
              next[index] = { ...row, products }
              setRows(next)
            }}
          />
        </div>
      ))}
    </div>
  )
}
