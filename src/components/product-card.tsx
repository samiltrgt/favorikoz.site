'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import ProductImage from '@/components/product-image'
import { Check, Star } from 'lucide-react'
import { addToCart } from '@/lib/cart'
import { formatTRY, toCartPrice } from '@/lib/price'
import { adItemsFromCart, adValueFromCart } from '@/lib/analytics/value'
import { trackAddToCart } from '@/lib/analytics/datalayer'
import './product-card.css'

export interface ProductCardProduct {
  id: string
  slug: string
  name: string
  brand?: string
  price: number
  original_price?: number | null
  image: string
  rating?: number
  reviews_count?: number
  /** Set only when rating/count were calculated from verified live reviews. */
  ratings_verified?: boolean
  in_stock?: boolean
  is_new?: boolean
  is_best_seller?: boolean
  images?: string[] | null
  subtitle?: string
  /** Gerçek ödül rozeti görselleri; yoksa uydurma rozet üretilmez */
  award_badges?: string[] | null
}

export type ProductCardVariant = 'grid' | 'list' | 'compact'

interface ProductCardProps {
  product: ProductCardProduct
  variant?: ProductCardVariant
  index?: number
  showBrandBadge?: boolean
}

export default function ProductCard({
  product,
  variant = 'grid',
  index,
}: ProductCardProps) {
  const compact = variant === 'compact'
  const hasRating =
    product.ratings_verified === true &&
    typeof product.rating === 'number' && Number.isFinite(product.rating) &&
    product.rating >= 1 && product.rating <= 5 &&
    typeof product.reviews_count === 'number' && Number.isInteger(product.reviews_count) &&
    product.reviews_count > 0
  const hasNoReviews = product.ratings_verified === true && product.reviews_count === 0
  const showRating = hasRating || hasNoReviews
  const [isCartLoading, setIsCartLoading] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const addedTimer = useRef<number | null>(null)
  // Only callers that know a card is in the initial viewport opt into priority.
  const firstScreen = index !== undefined && index < 2

  useEffect(() => {
    return () => {
      if (addedTimer.current) window.clearTimeout(addedTimer.current)
    }
  }, [])

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.in_stock === false) return
    setIsCartLoading(true)
    try {
      const cartItem = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        price: toCartPrice(product.price),
        qty: 1,
      }
      addToCart(cartItem)
      const contents = adItemsFromCart([cartItem])
      trackAddToCart({
        value: adValueFromCart([cartItem]),
        contents,
        items: contents.map((c) => ({
          item_id: c.id,
          item_name: product.name,
          quantity: c.quantity,
          price: c.item_price,
        })),
      })
      setJustAdded(true)
      if (addedTimer.current) window.clearTimeout(addedTimer.current)
      addedTimer.current = window.setTimeout(() => setJustAdded(false), 1100)
    } finally {
      setIsCartLoading(false)
    }
  }

  const discount =
    product.original_price && product.original_price > product.price
      ? Math.round(
          ((product.original_price - product.price) / product.original_price) * 100
        )
      : 0

  if (variant === 'list') {
    return (
      <div
        className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200"
        data-testid="product-card"
      >
        <Link href={`/urun/${product.slug}`} className="flex gap-6 p-4">
          <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-image bg-gray-50">
            <ProductImage
              src={product.image}
              alt={product.name}
              fill
              coverClassName="object-cover"
              containClassName="object-cover"
              sizes="80px"
              loading={firstScreen ? 'eager' : 'lazy'}
              fetchPriority={firstScreen ? 'high' : 'auto'}
            />
          </div>
          <div className="flex-1 flex items-center justify-between min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mb-1">
                <span aria-hidden>🚚</span> Bugün Kargoda
              </div>
              <h3 className="font-medium text-black text-sm mb-1 truncate">{product.name}</h3>
              {product.brand && (
                <p className="text-gray-400 text-xs mb-2 uppercase tracking-wide">{product.brand}</p>
              )}
              {showRating && <div
                className="flex items-center gap-1"
                role="img"
                aria-label={hasRating ? `5 üzerinden ${product.rating}` : 'Henüz değerlendirme yok'}
              >
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    aria-hidden
                    className={`w-3 h-3 ${
                      hasRating && i < Math.floor(product.rating || 0)
                        ? 'text-black'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-400 ml-1" aria-hidden>
                  {hasRating ? `(${product.reviews_count})` : 'Henüz değerlendirme yok'}
                </span>
              </div>}
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-light text-black">
                    ₺{formatTRY(product.price)}
                  </span>
                  {product.original_price != null &&
                    product.original_price > product.price && (
                      <span className="text-xs text-gray-400 line-through">
                        ₺{formatTRY(product.original_price)}
                      </span>
                    )}
                </div>
                {discount > 0 && (
                  <span className="text-xs text-red-500">-{discount}%</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.in_stock === false || isCartLoading}
                className="bg-brand-rose text-white px-6 py-2 text-xs hover:bg-brand-rose-deep transition-colors uppercase tracking-wide rounded-button disabled:bg-brand-bloom disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                {product.in_stock === false ? 'Stok Yok' : isCartLoading ? '...' : 'Ekle'}
              </button>
            </div>
          </div>
        </Link>
      </div>
    )
  }

  const cornerLabel =
    discount > 0
      ? `SAVE ${discount}%`
      : product.is_new
        ? 'NEW'
        : product.is_best_seller
          ? 'BESTSELLER'
          : null

  const brandLine =
    product.brand &&
    product.brand.trim().toLowerCase() !== product.name.trim().toLowerCase()
      ? product.brand
      : ''
  const subtitle = product.subtitle?.trim() || brandLine
  const ratingValue = product.rating || 0
  const outOfStock = product.in_stock === false
  const awards = (product.award_badges || []).filter(Boolean)

  return (
    <article
      className={`pcard${compact ? ' pcard--compact' : ''}`}
      data-testid="product-card"
    >
      <div className="pcard__media">
        <Link
          href={`/urun/${product.slug}`}
          aria-label={product.name}
          className="pcard__media-link"
        >
          <ProductImage
            src={product.image}
            alt={product.name}
            fill
            coverClassName="object-cover"
            containClassName="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
            loading={firstScreen ? 'eager' : 'lazy'}
            fetchPriority={firstScreen ? 'high' : 'auto'}
          />
        </Link>

        {cornerLabel && <span className="pcard__label">{cornerLabel}</span>}

        {awards.length > 0 && (
          <div className="pcard__awards" aria-hidden>
            {awards.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="pcard__award" />
            ))}
          </div>
        )}

        {outOfStock && (
          <div className="pcard__oos">
            <span>Stok Yok</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isCartLoading || outOfStock}
          aria-label={justAdded ? 'Sepete eklendi' : 'Sepete ekle'}
          className={`pcard__add${justAdded ? ' pcard__add--added' : ''}`}
        >
          <span key={justAdded ? 'added' : 'idle'} className="pcard__add-label">
            {outOfStock ? (
              'Stok Yok'
            ) : justAdded ? (
              <>
                <Check className="pcard__add-check" strokeWidth={2.5} aria-hidden />
                Eklendi
              </>
            ) : (
              'Sepete Ekle'
            )}
          </span>
        </button>
      </div>

      <div className="pcard__info">
        <div className="pcard__row">
          <Link href={`/urun/${product.slug}`} className="pcard__name">
            {product.name}
          </Link>
          <div className="pcard__price-col">
            <div className="pcard__price">₺{formatTRY(product.price)}</div>
            {product.original_price != null &&
              product.original_price > product.price && (
                <div className="pcard__price-was">
                  ₺{formatTRY(product.original_price)}
                </div>
              )}
          </div>
        </div>

        {subtitle ? <p className="pcard__desc">{subtitle}</p> : null}

        {showRating && <div
          className="pcard__rating"
          role="img"
          aria-label={hasRating ? `5 üzerinden ${ratingValue}` : 'Henüz değerlendirme yok'}
        >
          <div className="pcard__stars" aria-hidden>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`pcard__star ${hasRating && i < Math.floor(ratingValue) ? 'pcard__star--on' : 'pcard__star--off'}`}
                strokeWidth={0}
              />
            ))}
          </div>
          <span className="pcard__count" aria-hidden>
            {hasRating ? `(${product.reviews_count})` : 'Henüz değerlendirme yok'}
          </span>
        </div>}
      </div>
    </article>
  )
}
