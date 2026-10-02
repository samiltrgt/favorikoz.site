'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import ReferenceHeader, { type HeaderLink } from '@/components/ReferenceHeader'
import MiniCart from '@/components/mini-cart'
import { getCart, type CartItem } from '@/lib/cart'
import { useMenuCategories } from '@/components/categories-provider'

const STATIC_LINKS: HeaderLink[] = [
  { label: 'Anasayfa', href: '/' },
  { label: 'Tüm Ürünler', href: '/tum-urunler' },
]

function isActiveHref(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function toCategoryLinks(
  nodes: NonNullable<ReturnType<typeof useMenuCategories>>,
  ancestors: string[],
  pathname: string
): HeaderLink[] {
  return nodes.map((node) => {
    const path = [...ancestors, node.slug]
    const href = `/kategori/${path.join('/')}`
    const children = node.subcategories?.length
      ? toCategoryLinks(node.subcategories, path, pathname)
      : undefined
    return {
      label: node.name,
      href,
      current: isActiveHref(pathname, href),
      children,
    }
  })
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [miniOpen, setMiniOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const holdRef = useRef(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const menuCategories = useMenuCategories()

  const categoryLinks: HeaderLink[] = toCategoryLinks(menuCategories ?? [], [], pathname)

  const desktopLinks: HeaderLink[] = [
    ...STATIC_LINKS.map((link) => ({
      ...link,
      current: isActiveHref(pathname, link.href),
    })),
    ...categoryLinks,
  ]

  const menuLinks: HeaderLink[] = [
    ...desktopLinks,
    {
      label: 'Hakkımızda',
      href: '/hakkimizda',
      current: isActiveHref(pathname, '/hakkimizda'),
    },
  ]

  // Campaign banners are light product photos, so the header text stays dark.
  // The capsule frame appears only after scroll.
  const overlay = false

  const closeMini = useCallback(() => setMiniOpen(false), [])
  const quietCartPath = pathname === '/sepet' || pathname.startsWith('/checkout')

  useEffect(() => {
    setMiniOpen(false)
  }, [pathname])

  useEffect(() => {
    const syncCart = () => {
      const cart = getCart()
      setCartItems(cart)
      setCartCount(cart.reduce((sum, item) => sum + item.qty, 0))
      if (cart.length === 0) setMiniOpen(false)
    }
    const onAdded = (event: Event) => {
      syncCart()
      if (quietCartPath) return
      const id = (event as CustomEvent<{ id?: string }>).detail?.id ?? null
      holdRef.current = true
      setHighlightId(id)
      setMiniOpen(true)
      window.setTimeout(() => {
        holdRef.current = false
      }, 0)
    }
    syncCart()
    window.addEventListener('storage', syncCart)
    window.addEventListener('cartUpdated', syncCart)
    window.addEventListener('cartItemAdded', onAdded)
    return () => {
      window.removeEventListener('storage', syncCart)
      window.removeEventListener('cartUpdated', syncCart)
      window.removeEventListener('cartItemAdded', onAdded)
    }
  }, [quietCartPath])

  useEffect(() => {
    if (!searchOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusId = window.setTimeout(() => searchInputRef.current?.focus(), 50)
    return () => {
      document.body.style.overflow = previousOverflow
      window.clearTimeout(focusId)
    }
  }, [searchOpen])

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = searchQuery.trim()
    setSearchOpen(false)
    if (q) {
      router.push(`/tum-urunler?search=${encodeURIComponent(q)}`)
    } else {
      router.push('/tum-urunler')
    }
  }

  return (
    <>
      <ReferenceHeader
        brandName="Favori Kozmetik"
        homeHref="/"
        links={desktopLinks}
        menuLinks={menuLinks}
        overlay={overlay}
        cartCount={cartCount}
        contactEmail="mervesaat@gmail.com"
        socialLinks={[{ platform: 'instagram', href: 'https://www.instagram.com/favorikozmetik/' }]}
        announcement={
          <>
            Türkiye&apos;nin profesyonel kozmetik mağazası · Ücretsiz kargo fırsatlarını kaçırmayın
          </>
        }
        cartPreview={
          miniOpen && cartItems.length > 0 && !quietCartPath ? (
            <MiniCart
              items={cartItems}
              highlightId={highlightId}
              holdRef={holdRef}
              onClose={closeMini}
            />
          ) : null
        }
        onSearch={() => {
          setMiniOpen(false)
          setSearchQuery('')
          setSearchOpen(true)
        }}
        onCart={() => router.push('/sepet')}
        onAccount={() => router.push('/hesabim')}
        onFavorites={() => router.push('/favorilerim')}
      />

      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-28"
          role="dialog"
          aria-modal="true"
          aria-label="Ürün ara"
          data-testid="header-search-dialog"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false)
          }}
        >
          <form
            onSubmit={submitSearch}
            className="flex w-full max-w-xl items-center gap-2 rounded-full bg-white p-2 shadow-2xl"
          >
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün ara..."
              className="min-w-0 flex-1 rounded-full border-0 bg-transparent px-4 py-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
              aria-label="Ürün ara"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Ara
            </button>
            <button
              type="button"
              className="shrink-0 rounded-full px-3 py-3 text-sm text-neutral-500 hover:text-neutral-900"
              aria-label="Aramayı kapat"
              onClick={() => setSearchOpen(false)}
            >
              Kapat
            </button>
          </form>
        </div>
      )}
    </>
  )
}
