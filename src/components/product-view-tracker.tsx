'use client'

import { trackViewContent } from '@/lib/analytics/datalayer'
import { useConsentedTracking } from '@/lib/analytics/use-consented-tracking'

type Props = {
  productId: string
  name: string
  price: number
}

/** Ürün detay — ViewContent / view_item (client island; SSR sayfayı bozmaz) */
export default function ProductViewTracker({ productId, name, price }: Props) {
  useConsentedTracking(productId, (channels) => trackViewContent({ productId, name, value: price, ...channels }))

  return null
}
