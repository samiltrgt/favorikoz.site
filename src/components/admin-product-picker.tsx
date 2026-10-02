'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Plus, Search, Trash2 } from 'lucide-react'

export interface PickerProduct {
  id: string
  name: string
  brand?: string | null
  image?: string | null
}

interface AdminProductPickerProps {
  title: string
  description?: string
  selected: PickerProduct[]
  catalog: PickerProduct[]
  max?: number
  onChange: (next: PickerProduct[]) => void
}

export default function AdminProductPicker({
  title,
  description,
  selected,
  catalog,
  max = 12,
  onChange,
}: AdminProductPickerProps) {
  const [query, setQuery] = useState('')
  const selectedIds = useMemo(() => new Set(selected.map((product) => product.id)), [selected])
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr')
    return catalog
      .filter((product) => {
        if (!needle) return true
        return (
          product.name.toLocaleLowerCase('tr').includes(needle) ||
          (product.brand || '').toLocaleLowerCase('tr').includes(needle)
        )
      })
      .slice(0, 40)
  }, [catalog, query])

  const move = (index: number, direction: number) => {
    const next = index + direction
    if (next < 0 || next >= selected.length) return
    const copy = [...selected]
    const [item] = copy.splice(index, 1)
    copy.splice(next, 0, item)
    onChange(copy)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
        <p className="mt-1 text-xs text-gray-400">
          {selected.length}/{max} ürün
        </p>
      </div>
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        <div className="border-b border-gray-200 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-sm font-medium text-gray-800">Seçili ürünler</p>
          {selected.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Henüz ürün seçilmedi</p>
          ) : (
            <div className="space-y-2">
              {selected.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
                  <Image
                    src={product.image || '/placeholder.png'}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="truncate text-xs text-gray-500">{product.brand}</p>
                  </div>
                  <button type="button" onClick={() => move(index, -1)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Yukarı taşı">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Aşağı taşı">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(selected.filter((item) => item.id !== product.id))}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    aria-label="Listeden çıkar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ürün veya marka ara..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {results.map((product) => {
              const already = selectedIds.has(product.id)
              const full = selected.length >= max
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={already || full}
                  onClick={() => onChange([...selected, product])}
                  className={`flex w-full items-center gap-3 rounded-lg border px-2 py-2 text-left ${
                    already || full ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Image
                    src={product.image || '/placeholder.png'}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{product.name}</span>
                    <span className="block truncate text-xs text-gray-500">{product.brand}</span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
