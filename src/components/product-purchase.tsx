'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, Heart, Check } from 'lucide-react'
import { addToCart } from '@/lib/cart'
import { toCartPrice } from '@/lib/price'
import { adItemsFromCart, adValueFromCart } from '@/lib/analytics/value'
import { trackAddToCart } from '@/lib/analytics/datalayer'
import { toggleFavorite, isFavorite } from '@/lib/favorites'

export type ProductPurchaseProduct = {
  id: string
  slug: string
  name: string
  image: string | null
  price: number
  in_stock: boolean
}

function QuantitySelector({ onChange }: { onChange?: (qty: number) => void }) {
  const [qty, setQty] = useState(1)
  const set = (val: number) => {
    setQty(val)
    onChange?.(val)
  }
  return (
    <div className="inline-flex items-center border-2 border-gray-300 rounded-input overflow-hidden h-14 bg-white">
      <button
        type="button"
        className="w-12 h-full grid place-items-center hover:bg-gray-100 transition-colors duration-200"
        onClick={() => set(Math.max(1, qty - 1))}
        aria-label="Azalt"
      >
        <Minus className="w-5 h-5" />
      </button>
      <div className="w-12 text-center text-lg font-bold select-none text-gray-900">{qty}</div>
      <button
        type="button"
        className="w-12 h-full grid place-items-center hover:bg-gray-100 transition-colors duration-200"
        onClick={() => set(Math.min(99, qty + 1))}
        aria-label="Artır"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  )
}

export function FavButton({ id }: { id: string }) {
  const [fav, setFav] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFavoriteStatus = async () => {
      try {
        const isFav = await isFavorite(id)
        setFav(isFav)
      } catch (err) {
        console.error('Error loading favorite status:', err)
      }
    }
    loadFavoriteStatus()
  }, [id])

  const handleToggle = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await toggleFavorite(id)
      if (result.success) {
        setFav(result.isFavorite)
      } else {
        setError(result.error || 'Bir hata oluştu')
        if (result.error?.includes('giriş')) {
          if (confirm('Favorilere eklemek için giriş yapmanız gerekiyor. Giriş sayfasına yönlendirilsin mi?')) {
            window.location.href = '/giris'
          }
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
      setError('Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-button transition-all duration-200 font-ui disabled:opacity-50 disabled:cursor-not-allowed ${
        fav
          ? 'text-red-600 bg-red-50 hover:bg-red-100'
          : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
      }`}
      title={error || undefined}
    >
      <Heart className={`w-5 h-5 ${fav ? 'fill-current' : ''} ${isLoading ? 'animate-pulse' : ''}`} />
      <span className="text-sm">
        {isLoading ? 'Yükleniyor...' : fav ? 'Favorilerde' : 'Favorilere ekle'}
      </span>
    </button>
  )
}

export default function ProductPurchase({ product }: { product: ProductPurchaseProduct }) {
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <QuantitySelector onChange={(q) => setQty(q)} />
        <button
          type="button"
          disabled={!product.in_stock}
          onClick={() => {
            if (!product.in_stock) return
            const cartItem = {
              id: product.id,
              slug: product.slug,
              name: product.name,
              image: product.image || '',
              price: toCartPrice(product.price),
              qty,
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
            setAdded(true)
            setTimeout(() => setAdded(false), 1500)
          }}
          className={`flex-1 h-14 rounded-button transition-all duration-300 text-16 font-ui shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${
            added
              ? 'bg-brand-rose-deep text-white'
              : product.in_stock
                ? 'bg-brand-rose text-white hover:bg-brand-rose-deep active:scale-95'
                : 'bg-brand-bloom text-muted-foreground'
          }`}
        >
          {added ? (
            <span className="inline-flex items-center gap-2">
              <Check className="w-5 h-5" />
              Eklendi!
            </span>
          ) : product.in_stock ? (
            'Sepete Ekle'
          ) : (
            'Stokta Yok'
          )}
        </button>
      </div>

      <div className="flex items-center">
        <Link
          href="/tum-urunler"
          className="flex-1 h-12 inline-flex items-center justify-center rounded-button border border-[var(--color-border-hex)] text-16 font-ui text-brand-ink bg-white hover:bg-brand-mist transition-all duration-300 shadow-none"
        >
          Alışverişe Devam Et
        </Link>
      </div>
    </div>
  )
}
