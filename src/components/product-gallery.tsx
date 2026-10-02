'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductImage from '@/components/product-image'

type ProductGalleryProps = {
  images: string[]
  productName: string
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const allImages = images.filter(Boolean)

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % allImages.length)
  }

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }

  useEffect(() => {
    if (allImages.length <= 1) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedImageIndex((prev) => (prev + 1) % allImages.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [allImages.length])

  if (allImages.length === 0) {
    return (
      <div className="relative w-full aspect-square bg-gray-50 overflow-hidden rounded-image" />
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-square bg-gray-50 overflow-hidden rounded-image group">
        <ProductImage
          src={allImages[selectedImageIndex]}
          alt={productName}
          fill
          priority
          containClassName="object-contain p-3"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />

        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95"
              aria-label="Önceki görsel"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button
              type="button"
              onClick={nextImage}
              className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95"
              aria-label="Sonraki görsel"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-black bg-opacity-50 text-white px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {selectedImageIndex + 1} / {allImages.length}
            </div>
          </>
        )}
      </div>

      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedImageIndex(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-image overflow-hidden border-2 transition-all duration-200 ${
                selectedImageIndex === index
                  ? 'border-black ring-2 ring-black ring-opacity-20'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <ProductImage
                src={image}
                alt={`${productName} - Görsel ${index + 1}`}
                width={80}
                height={80}
                className="w-full h-full bg-gray-50"
                containClassName="object-contain p-0.5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
