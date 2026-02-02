'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Printer, ArrowLeft } from 'lucide-react'

const SENDER_NAME = process.env.NEXT_PUBLIC_STORE_NAME || 'Favori Kozmetik'
const SENDER_ADDRESS = process.env.NEXT_PUBLIC_STORE_ADDRESS || ''

type ShippingAddress = {
  address?: string
  city?: string
  zipcode?: string
  postalCode?: string
}

type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string | null
  shipping_address: ShippingAddress | null
}

function getZipcode(addr: ShippingAddress | null): string {
  if (!addr) return ''
  return (addr.zipcode ?? addr.postalCode ?? '').toString()
}

export default function ShippingLabelPage() {
  const params = useParams()
  const orderId = params?.orderId as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    fetch(`/api/admin/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.success && data.data) {
          setOrder(data.data)
        } else {
          setError(data.error || 'Sipariş bulunamadı')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Sipariş yüklenemedi')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [orderId])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <p className="text-red-600 mb-4">{error || 'Sipariş bulunamadı'}</p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-black hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Siparişlere dön
        </Link>
      </div>
    )
  }

  const addr = order.shipping_address || {}
  const zipcode = getZipcode(order.shipping_address)
  const cityLine = [addr.city, zipcode].filter(Boolean).join(' ')

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              #shipping-label-print,
              #shipping-label-print * { visibility: visible; }
              #shipping-label-print {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                min-height: 100vh;
                background: white;
              }
              #shipping-label-no-print { display: none !important; }
            }
          `,
        }}
      />

      <div id="shipping-label-no-print" className="p-6 flex flex-wrap items-center gap-4 border-b border-gray-200 bg-gray-50">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Siparişlere dön
        </Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          <Printer className="w-4 h-4" />
          Yazdır
        </button>
      </div>

      <div id="shipping-label-print" className="p-8">
        <div
          className="border-2 border-black rounded-lg p-6 max-w-md mx-auto bg-white"
          style={{ fontSize: '16px' }}
        >
          <div className="text-center font-bold text-lg tracking-wide mb-4 pb-2 border-b-2 border-black">
            SÜRAT KARGO – ALICI
          </div>
          <div className="space-y-2 mb-4">
            <p className="font-semibold">{order.customer_name}</p>
            {order.customer_phone && (
              <p>{order.customer_phone}</p>
            )}
            {addr.address && <p>{addr.address}</p>}
            {cityLine && <p>{cityLine}</p>}
          </div>
          <div className="border-t border-gray-400 pt-3 mt-3 space-y-1 text-sm">
            <p><span className="font-semibold">Sipariş:</span> {order.order_number}</p>
            <p><span className="font-semibold">Gönderen:</span> {SENDER_NAME}</p>
            {SENDER_ADDRESS && <p className="text-gray-700">{SENDER_ADDRESS}</p>}
          </div>
        </div>
      </div>
    </>
  )
}
