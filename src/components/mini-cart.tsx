'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import Link from 'next/link'
import type { CartItem } from '@/lib/cart'
import { formatTRY, toDisplayPrice } from '@/lib/price'

const VISIBLE_COUNT = 3

interface MiniCartProps {
  items: CartItem[]
  highlightId?: string | null
  holdRef: RefObject<boolean>
  onClose: () => void
}

export default function MiniCart({ items, highlightId, holdRef, onClose }: MiniCartProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (holdRef.current) return
      const panel = panelRef.current
      if (panel && event.target instanceof Node && panel.contains(event.target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [holdRef, onClose])

  const ordered = [...items].reverse()
  if (highlightId) {
    ordered.sort((a, b) => Number(b.id === highlightId) - Number(a.id === highlightId))
  }
  const visible = ordered.slice(0, VISIBLE_COUNT)
  const extra = items.length - visible.length
  const total = items.reduce((sum, item) => sum + toDisplayPrice(item.price) * item.qty, 0)

  return (
    <div
      ref={panelRef}
      className="rh-minicart"
      role="status"
      aria-label="Sepet özeti"
      data-lenis-prevent
    >
      <p className="rh-minicart__kicker">Sepete eklendi</p>
      <ul className="rh-minicart__list">
        {visible.map((item) => (
          <li
            key={item.id}
            className={`rh-minicart__item${item.id === highlightId ? ' is-new' : ''}`}
          >
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="rh-minicart__thumb" src={item.image} alt="" />
            ) : (
              <span className="rh-minicart__thumb" />
            )}
            <div className="rh-minicart__copy">
              <p className="rh-minicart__name">{item.name}</p>
              {item.qty > 1 ? <p className="rh-minicart__meta">{item.qty} adet</p> : null}
            </div>
            <span className="rh-minicart__price">
              ₺{formatTRY(toDisplayPrice(item.price) * item.qty)}
            </span>
          </li>
        ))}
      </ul>
      {extra > 0 ? (
        <p className="rh-minicart__more">+{extra} ürün daha</p>
      ) : null}
      <div className="rh-minicart__total">
        <span>Toplam</span>
        <span>₺{formatTRY(total)}</span>
      </div>
      <div className="rh-minicart__actions">
        <button type="button" className="rh-minicart__ghost" onClick={onClose}>
          Devam et
        </button>
        <Link href="/checkout" className="rh-minicart__go" onClick={onClose}>
          Ödemeye geç
        </Link>
      </div>
    </div>
  )
}
