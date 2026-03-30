'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, ShoppingCart, Heart, User, Menu, X, ChevronDown } from 'lucide-react'
import { getCart } from '@/lib/cart'
import { getFavorites } from '@/lib/favorites'

// Static menu items (not categories)
const staticMenuItems = [
  { name: 'Anasayfa', href: '/' },
  { name: 'Tüm Ürünler', href: '/tum-urunler' },
]

interface Subcategory {
  name: string
  href: string
  key: string
  depth?: number
  children?: Subcategory[]
}

interface Category {
  name: string
  href: string
  hasDropdown: boolean
  subcategories?: Subcategory[]
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [user, setUser] = useState<any>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState<Record<string, boolean>>({})
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef<HTMLElement>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false)
  const [mobileMenuAnimated, setMobileMenuAnimated] = useState(false)

  // Sync search query from URL when on tum-urunler page
  useEffect(() => {
    if (pathname === '/tum-urunler') {
      const urlSearch = searchParams.get('search') || ''
      setSearchQuery(urlSearch)
    } else {
      // Clear search when navigating away from search page
      setSearchQuery('')
    }
  }, [pathname, searchParams])

  // Calculate header height for mobile menu positioning (rAF ile reflow'u kritik yoldan çıkarır)
  useEffect(() => {
    let rafId = 0
    const updateHeaderHeight = () => {
      rafId = requestAnimationFrame(() => {
        if (headerRef.current) {
          setHeaderHeight(headerRef.current.offsetHeight)
        }
      })
    }

    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

  // Lock body scroll when mobile menu is open + trigger slide-down animation
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
      setMobileMenuAnimated(false)
      const t = setTimeout(() => setMobileMenuAnimated(true), 50)
      return () => clearTimeout(t)
    } else {
      document.body.style.overflow = ''
      setMobileMenuAnimated(false)
    }
  }, [isMenuOpen])

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/tum-urunler?search=${encodeURIComponent(searchQuery.trim())}`)
      setIsMenuOpen(false) // Close mobile menu if open
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(e)
    }
  }

  // Load user on mount (safe for unmount)
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const result = await response.json()
        if (!isMounted) return
        setUser(result.success ? result.user : null)
      } catch {
        if (!isMounted) return
        setUser(null)
      }
    }

    load()
    
    // Listen for auth changes
    const handleAuthChange = () => {
      load()
    }
    
    window.addEventListener('authChanged', handleAuthChange)
    return () => {
      isMounted = false
      window.removeEventListener('authChanged', handleAuthChange)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      setUser(null)
      setShowUserMenu(false)
      window.dispatchEvent(new Event('authChanged'))
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Sepet sayısını güncelle
  useEffect(() => {
    const updateCartCount = () => {
      const cart = getCart()
      const totalItems = cart.reduce((sum, item) => sum + item.qty, 0)
      setCartCount(totalItems)
    }

    // İlk yükleme
    updateCartCount()

    // Storage değişikliklerini dinle
    const handleStorageChange = () => {
      updateCartCount()
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Custom event dinle (aynı tab içinde değişiklikler için)
    window.addEventListener('cartUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('cartUpdated', handleStorageChange)
    }
  }, [])

  // Favoriler sayısını güncelle
  useEffect(() => {
    const updateFavoritesCount = async () => {
      try {
        const favorites = await getFavorites()
        setFavoritesCount(favorites.length)
      } catch (error) {
        // If not authenticated, count will be 0
        setFavoritesCount(0)
      }
    }

    // İlk yükleme
    updateFavoritesCount()

    // Favoriler değiştiğinde güncelle
    const handleFavoritesChange = () => {
      updateFavoritesCount()
    }

    window.addEventListener('favoritesUpdated', handleFavoritesChange)

    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesChange)
    }
  }, [])

  // Load categories from API
  useEffect(() => {
    let isMounted = true
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories', { cache: 'no-store' })
        const result = await response.json()
        if (!isMounted) return
        
        if (result.success && result.data) {
          const flattenForMenu = (
            node: any,
            rootSlug: string,
            depth: number = 0,
            ancestors: string[] = []
          ): Subcategory[] => {
            const path = [...ancestors, node.slug]
            const href = `/kategori/${rootSlug}/${path.join('/')}`
            const current: Subcategory = {
              name: node.name,
              href,
              key: node.slug,
              depth,
              children: node.subcategories || [],
            }
            const children = (node.subcategories || []).flatMap((child: any) =>
              flattenForMenu(child, rootSlug, depth + 1, path)
            )
            return [current, ...children]
          }

          // Transform API data to header format
          const transformedCategories = result.data.map((cat: any) => ({
            name: cat.name,
            href: `/kategori/${cat.slug}`,
            hasDropdown: cat.subcategories && cat.subcategories.length > 0,
            subcategories: (cat.subcategories || []).flatMap((sub: any) => flattenForMenu(sub, cat.slug)),
          }))
          setCategories(transformedCategories)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        // Fallback to empty array on error
        if (isMounted) setCategories([])
      }
    }
    
    loadCategories()
    return () => { isMounted = false }
  }, [])

  // Load category/subcategory counts from API (stokta olan ürünler; navbar’da güncel sayı)
  useEffect(() => {
    let isMounted = true
    const loadCounts = async () => {
      try {
        const res = await fetch('/api/products?view=counts&limit=500', { cache: 'no-store' })
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const counts: Record<string, number> = {}
          for (const p of json.data as any[]) {
            const catSlug = p.category_slug || p.category
            const subSlug = p.subcategory_slug
            if (subSlug) {
              counts[subSlug] = (counts[subSlug] || 0) + 1
            }
            if (catSlug) {
              counts[catSlug] = (counts[catSlug] || 0) + 1
            }
          }
          if (!isMounted) return
          setCategoryCounts(counts)
        }
      } catch {}
    }
    loadCounts()
    return () => { isMounted = false }
  }, [])

  const closeMobileMenu = () => {
    setMobileMenuClosing(true)
    setTimeout(() => {
      setIsMenuOpen(false)
      setMobileMenuClosing(false)
    }, 300)
  }

  return (
    <header ref={headerRef} className="sticky top-0 z-[100] bg-black/20 backdrop-blur-md">
      {/* Gradient orbs – clipped inside this wrapper so header has no overflow (mobile menu can show) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -right-60 -top-10 flex flex-col items-end blur-xl">
          <div className="h-40 w-[60rem] rounded-full bg-gradient-to-b from-[#2c2520] to-[#f5f0e8] blur-3xl" />
          <div className="h-40 w-[90rem] rounded-full bg-gradient-to-b from-[#c4a090] to-[#e8dfd4] blur-3xl" />
          <div className="h-40 w-[60rem] rounded-full bg-gradient-to-b from-[#d4c4b0] to-[#f5f0e8] blur-3xl" />
        </div>
      </div>

      <div className="relative z-10">
        <nav className="container mx-auto flex items-center justify-between px-4 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black">
              <span className="text-sm font-bold">F</span>
            </div>
            <span className="ml-2 text-xl font-bold text-white">Favori Kozmetik</span>
          </Link>

          {/* Desktop: Nav links + Search + Actions */}
          <div className="hidden lg:flex items-center gap-8">
            {staticMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-white/90 hover:text-white transition-colors"
              >
                {item.name}
              </Link>
            ))}
            {categories.map((category) => (
              <div key={category.name} className="relative">
                {category.hasDropdown ? (
                  <div
                    className="flex items-center gap-1 cursor-pointer"
                    onMouseEnter={() => setHoveredCategory(category.name)}
                  >
                    <Link
                      href={category.href}
                      className="text-sm font-medium text-white/90 hover:text-white transition-colors"
                    >
                      {category.name}
                    </Link>
                    <ChevronDown
                      className={`w-4 h-4 text-white/80 transition-transform ${hoveredCategory === category.name ? 'rotate-180' : ''}`}
                    />
                  </div>
                ) : (
                  <Link
                    href={category.href}
                    className="text-sm font-medium text-white/90 hover:text-white transition-colors"
                  >
                    {category.name}
                  </Link>
                )}
                {category.hasDropdown && hoveredCategory === category.name && (
                  <div
                    className="absolute left-1/2 top-full -translate-x-1/2 mt-1 w-56 rounded-xl border border-white/10 bg-gray-900/95 p-3 shadow-xl backdrop-blur-sm"
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    {category.subcategories?.map((sub: Subcategory) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                        onClick={() => setHoveredCategory(null)}
                      >
                        <span style={{ paddingLeft: `${(sub.depth || 0) * 10}px` }}>{sub.name}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">
                          {categoryCounts[sub.key] ?? 0}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <form className="flex flex-1 max-w-[200px]" onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  placeholder="Ürün ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full rounded-full border border-white/20 bg-white/5 py-2 pl-8 pr-3 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
                />
              </div>
            </form>
            <Link
              href="/favorilerim"
              className="relative text-white/90 hover:text-white transition-colors"
              aria-label={`Favoriler${favoritesCount > 0 ? ` (${favoritesCount})` : ''}`}
            >
              <Heart className="h-5 w-5" />
              {favoritesCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </Link>
            <Link
              href="/sepet"
              className="relative text-white/90 hover:text-white transition-colors"
              aria-label={`Sepet${cartCount > 0 ? ` (${cartCount})` : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  {user.name?.split(' ')[0] || 'Hesabım'}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>
                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-gray-900/95 py-2 shadow-xl backdrop-blur-sm"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <Link
                      href="/hesabim"
                      className="block px-4 py-2 text-sm text-gray-200 hover:bg-white/10 hover:text-white"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Hesabım
                    </Link>
                    <Link
                      href="/siparislerim"
                      className="block px-4 py-2 text-sm text-gray-200 hover:bg-white/10 hover:text-white"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Siparişlerim
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/giris"
                className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black hover:bg-white/90 transition-colors"
                data-testid="user-icon"
              >
                Giriş Yap
              </Link>
            )}
          </div>

          {/* Mobile: Favoriler + Sepet + menu button */}
          <div className="flex items-center gap-1 lg:hidden">
            <Link
              href="/favorilerim"
              className="relative flex min-h-[44px] min-w-[44px] items-center justify-center text-white/90 hover:text-white touch-manipulation"
              aria-label={`Favoriler${favoritesCount > 0 ? ` (${favoritesCount})` : ''}`}
            >
              <Heart className="h-5 w-5" />
              {favoritesCount > 0 && (
                <span className="absolute right-0 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </Link>
            <Link
              href="/sepet"
              className="relative flex min-h-[44px] min-w-[44px] items-center justify-center text-white/90 hover:text-white touch-manipulation"
              aria-label={`Sepet${cartCount > 0 ? ` (${cartCount})` : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); isMenuOpen ? closeMobileMenu() : setIsMenuOpen(true); }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-white touch-manipulation"
              aria-label="Menüyü aç/kapat"
              aria-expanded={isMenuOpen}
              data-testid="mobile-menu-button"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu – full-screen overlay, portaled to body so height is correct */}
      {typeof document !== 'undefined' &&
        (isMenuOpen || mobileMenuClosing) &&
        createPortal(
          <div
            id="mobile-menu"
            data-testid="mobile-menu"
            className="fixed inset-0 z-[100] flex flex-col bg-black lg:hidden"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              minHeight: '100dvh',
              height: '100dvh',
              transform: mobileMenuClosing ? 'translateY(-100%)' : mobileMenuAnimated ? 'translateY(0)' : 'translateY(-100%)',
              transition: 'transform 0.3s ease-out',
              willChange: 'transform',
            }}
          >
            {/* Aynı gradient orblar – header ile aynı renk / görünüm */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-60 -top-10 flex flex-col items-end blur-xl">
                <div className="h-40 w-[60rem] rounded-full bg-gradient-to-b from-[#2c2520] to-[#f5f0e8] blur-3xl" />
                <div className="h-40 w-[90rem] rounded-full bg-gradient-to-b from-[#c4a090] to-[#e8dfd4] blur-3xl" />
                <div className="h-40 w-[60rem] rounded-full bg-gradient-to-b from-[#d4c4b0] to-[#f5f0e8] blur-3xl" />
              </div>
            </div>
            <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 overscroll-contain" style={{ minHeight: 0 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black">
                  <span className="text-sm font-bold">F</span>
                </div>
                <span className="ml-2 text-xl font-bold text-white">Favori Kozmetik</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeMobileMenu(); }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-white touch-manipulation"
                aria-label="Menüyü kapat"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form className="mt-6 mb-4" onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  placeholder="Ürün, kategori veya marka ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-4 text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
                />
              </div>
            </form>

            <nav className="flex flex-col space-y-1">
              {staticMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg py-3 px-3 text-base text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                  onClick={closeMobileMenu}
                >
                  {item.name}
                </Link>
              ))}
              {categories.map((category: Category) => {
                if (category.hasDropdown) {
                  const isOpen = mobileCategoriesOpen[category.name] || false
                  return (
                    <div key={category.name}>
                      <button
                        type="button"
                        onClick={() =>
                          setMobileCategoriesOpen({ ...mobileCategoriesOpen, [category.name]: !isOpen })
                        }
                        className="flex w-full items-center justify-between rounded-lg py-3 px-3 text-base text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <span>{category.name}</span>
                        <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && category.subcategories && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-4">
                          {category.subcategories.map((sub: Subcategory) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className="flex items-center justify-between py-2 text-sm text-white/70 hover:text-white transition-colors"
                              onClick={() => {
                                closeMobileMenu()
                                setMobileCategoriesOpen({})
                              }}
                            >
                              <span style={{ paddingLeft: `${(sub.depth || 0) * 10}px` }}>{sub.name}</span>
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                                {categoryCounts[sub.key] ?? 0}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
                return (
                  <Link
                    key={category.href}
                    href={category.href}
                    className="rounded-lg py-3 px-3 text-base text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                    onClick={closeMobileMenu}
                  >
                    {category.name}
                  </Link>
                )
              })}
              <Link
                href="/hakkimizda"
                className="rounded-lg py-3 px-3 text-base text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                onClick={closeMobileMenu}
              >
                Hakkımızda
              </Link>
              <Link
                href="/iletisim"
                className="rounded-lg py-3 px-3 text-base text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                onClick={closeMobileMenu}
              >
                İletişim
              </Link>
            </nav>

            <div className="mt-6 border-t border-white/10 pt-6 space-y-3">
              <Link
                href="/favorilerim"
                className="flex items-center gap-3 rounded-lg py-3 px-3 text-white/90 hover:bg-white/10 transition-colors"
                onClick={closeMobileMenu}
              >
                <Heart className="h-5 w-5" />
                <span>Favoriler{favoritesCount > 0 ? ` (${favoritesCount})` : ''}</span>
              </Link>
              <Link
                href="/sepet"
                className="flex items-center gap-3 rounded-lg py-3 px-3 text-white/90 hover:bg-white/10 transition-colors"
                onClick={closeMobileMenu}
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Sepet{cartCount > 0 ? ` (${cartCount})` : ''}</span>
              </Link>
              {user ? (
                <Link
                  href="/hesabim"
                  className="flex items-center gap-3 rounded-lg py-3 px-3 text-white/90 hover:bg-white/10 transition-colors"
                  onClick={closeMobileMenu}
                >
                  <User className="h-5 w-5" />
                  <span>Hesabım</span>
                </Link>
              ) : (
                <Link
                  href="/giris"
                  className="flex h-12 items-center justify-center rounded-full bg-white text-base font-medium text-black hover:bg-white/90 transition-colors"
                  onClick={closeMobileMenu}
                >
                  Giriş Yap
                </Link>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  )
}
