'use client'

import { useEffect, useRef } from 'react'
import { trackViewContent } from '@/lib/analytics/datalayer'

type Props = {
  productId: string
  name: string
  price: number
}

/** Ürün detay — ViewContent / view_item (client island; SSR sayfayı bozmaz) */
export default function ProductViewTracker({ productId, name, price }: Props) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    trackViewContent({ productId, name, value: price })
  }, [productId, name, price])

  return null
}
