'use client'

import dynamic from 'next/dynamic'

const AdaptiveScrollHero = dynamic(() => import('@/components/adaptive-scroll-hero'), {
  ssr: false,
})

type ProductLike = { image?: string | null }

export default function DeferredAdaptiveScrollHero({ products }: { products: ProductLike[] }) {
  return <AdaptiveScrollHero products={products} />
}
