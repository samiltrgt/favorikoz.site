'use client'

import Image, { type ImageProps } from 'next/image'
import { useCallback, useState } from 'react'

/** Kareye yakın görseller cover ile doldurulur; uzun/dar olanlar contain ile sığdırılır. */
const SQUARE_MIN = 0.88
const SQUARE_MAX = 1.12

type ProductImageProps = ImageProps & {
  coverClassName?: string
  containClassName?: string
}

export default function ProductImage({
  className = '',
  coverClassName = 'object-cover',
  containClassName = 'object-contain p-1',
  onLoad,
  ...props
}: ProductImageProps) {
  const [fit, setFit] = useState<'cover' | 'contain'>('cover')

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const img = event.currentTarget
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const ratio = img.naturalWidth / img.naturalHeight
        setFit(ratio >= SQUARE_MIN && ratio <= SQUARE_MAX ? 'cover' : 'contain')
      }
      onLoad?.(event)
    },
    [onLoad]
  )

  const fitClass = fit === 'cover' ? coverClassName : containClassName
  const merged = [fitClass, className].filter(Boolean).join(' ')

  return <Image {...props} className={merged} onLoad={handleLoad} />
}
