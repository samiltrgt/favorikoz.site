'use client'

import { useState, useEffect, useRef } from 'react'
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

  // Calculate header height for mobile menu positioning
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight)
      }
    }
    
    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    
    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ''
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
          // Transform API data to header format
          const transformedCategories = result.data.map((cat: any) => ({
            name: cat.name,
            href: `/kategori/${cat.slug}`,
            hasDropdown: cat.subcategories && cat.subcategories.length > 0,
            subcategories: cat.subcategories?.map((sub: any) => ({
              name: sub.name,
              href: `/kategori/${cat.slug}/${sub.slug}`,
              key: sub.slug
            })) || []
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

  // Load category counts dynamically from API so edits reflect in header
  useEffect(() => {
    let isMounted = true
    const loadCounts = async () => {
      try {
        const res = await fetch('/api/products', { cache: 'no-store' })
        const json = await res.json()
        if (json.success) {
          const counts: Record<string, number> = {}
          for (const p of json.data as any[]) {
            const key = p.category
            if (!key) continue
            counts[key] = (counts[key] || 0) + 1
          }
          if (!isMounted) return
          setCategoryCounts(counts)
        }
      } catch {}
    }
    loadCounts()
    return () => { isMounted = false }
  }, [])

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-white border-b border-gray-200">
      {/* Top bar */}
      <div className="bg-gray-50 py-2">
        <div className="container">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>📞 0537 647 07 10</span>
              <span>📧 mervesaat@gmail.com</span>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/hakkimizda" className="hover:text-gray-900">Hakkımızda</Link>
              <Link href="/iletisim" className="hover:text-gray-900">İletişim</Link>
              <Link href="/admin/login" className="hover:text-gray-900 font-medium text-gray-800">Admin</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container py-4">
        <div className="flex items-center justify-between">
                     {/* Logo */}
           <Link href="/" className="flex items-center">
             <h1 className="text-2xl font-light text-black tracking-wide">Favori Kozmetik</h1>
           </Link>

                     {/* Search bar - Desktop */}
           <form className="hidden lg:flex flex-1 max-w-md mx-8" onSubmit={handleSearch}>
             <div className="relative w-full">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
               <input
                 type="text"
                 placeholder="Ürün ara..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyDown={handleSearchKeyDown}
                 className="w-full pl-10 pr-4 py-2 border-b border-gray-300 bg-transparent focus:outline-none focus:border-black text-sm tracking-wide"
               />
             </div>
           </form>

          {/* Actions */}
          <div className="flex items-center space-x-6">
            <button 
              onClick={handleSearch}
              className="hidden lg:flex text-gray-600 hover:text-gray-900"
              aria-label="Ara"
            >
              <Search className="w-5 h-5" />
            </button>
            
            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden md:inline text-sm font-medium">
                    {user.name?.split(' ')[0] || 'Hesabım'}
                  </span>
                  <ChevronDown className="w-4 h-4 hidden md:inline" />
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                    <Link
                      href="/hesabim"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Hesabım
                    </Link>
                    <Link
                      href="/siparislerim"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Siparişlerim
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/giris" className="text-gray-600 hover:text-gray-900" data-testid="user-icon">
                <User className="w-5 h-5" />
              </Link>
            )}
            
            <Link
              href="/favorilerim"
              className="text-gray-600 hover:text-gray-900 relative"
              aria-label={`Favoriler${favoritesCount > 0 ? ` (${favoritesCount} ürün)` : ''}`}
              title="Favorilerim"
            >
              <Heart className="w-5 h-5" />
              {favoritesCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-4 h-4 flex items-center justify-center px-1">
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </Link>
            
            <Link
              href="/sepet"
              className="text-gray-600 hover:text-gray-900 relative"
              aria-label={`Sepet${cartCount > 0 ? ` (${cartCount} ürün)` : ''}`}
              title="Sepet"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-4 h-4 flex items-center justify-center px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
              aria-label="Menüyü aç/kapat"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              data-testid="mobile-menu-button"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

             {/* Navigation */}
       <nav className="border-t border-gray-200">
         <div className="container">
           <div className="hidden lg:flex items-center justify-center space-x-8 py-4">
            {staticMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-light text-black hover:text-gray-600 active:scale-95 transition-all duration-200 tracking-wide py-2"
              >
                {item.name}
              </Link>
            ))}
            {categories.map((category) => (
               <div 
                 key={category.name}
                 className="relative"
               >
                 {category.hasDropdown ? (
                   <div className="flex items-center gap-1">
                     <Link
                       href={category.href}
                       className="text-sm font-light text-black hover:text-gray-600 active:scale-95 transition-all duration-200 tracking-wide py-2"
                     >
                       {category.name}
                     </Link>
                     <button 
                       onClick={() => setHoveredCategory(hoveredCategory === category.name ? null : category.name)}
                       className="p-1 hover:bg-gray-100 rounded transition-colors"
                       aria-label="Alt kategorileri göster"
                     >
                       <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${hoveredCategory === category.name ? 'rotate-180' : ''}`} />
                     </button>
                   </div>
                 ) : (
                   <Link
                     href={category.href}
                     className="text-sm font-light text-black hover:text-gray-600 active:scale-95 transition-all duration-200 tracking-wide py-2"
                   >
                     {category.name}
                   </Link>
                 )}
                 
                 {/* Dropdown Menu with connecting bridge */}
                 {category.hasDropdown && hoveredCategory === category.name && (
                   <>
                     {/* Invisible bridge to prevent gap */}
                     <div className="absolute top-full left-1/2 -translate-x-1/2 w-64 h-2 bg-transparent"></div>
                     
                     <div 
                       className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white shadow-xl border border-gray-200 rounded-lg p-4 z-50 animate-slide-in-up"
                       onMouseLeave={() => setHoveredCategory(null)}
                     >
                       <div className="grid grid-cols-1 gap-1">
                         {category.subcategories?.map((subcategory: Subcategory, index: number) => (
                           <Link
                             key={subcategory.href}
                             href={subcategory.href}
                             className="text-sm text-gray-700 hover:text-black hover:bg-gray-50 active:scale-95 px-3 py-2.5 rounded transition-all duration-200 animate-fade-in-up flex items-center justify-between"
                             style={{ animationDelay: `${index * 50}ms` }}
                             onClick={() => setHoveredCategory(null)}
                           >
                             <span>{subcategory.name}</span>
                             <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                               {categoryCounts[subcategory.key as string] || 0}
                             </span>
                           </Link>
                         ))}
                       </div>
                     </div>
                   </>
                 )}
               </div>
             ))}
           </div>
         </div>
       </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div 
          id="mobile-menu" 
          className="lg:hidden bg-white border-t border-gray-200 fixed inset-x-0 bottom-0 overflow-y-auto z-50" 
          data-testid="mobile-menu" 
          style={{ 
            top: `${headerHeight}px`,
            maxHeight: `calc(100vh - ${headerHeight}px)`
          }}
        >
          <div className="container py-4">
            {/* Mobile search */}
            <form className="mb-4" onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Ürün, kategori veya marka ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Mobile categories */}
            <div className="space-y-2 pb-4">
              {staticMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block py-2 text-sm text-gray-700 hover:text-purple-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
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
                        onClick={() => setMobileCategoriesOpen({ ...mobileCategoriesOpen, [category.name]: !isOpen })}
                        className="flex items-center justify-between w-full py-2 text-sm text-gray-700 hover:text-purple-600 transition-colors"
                      >
                        <span>{category.name}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && category.subcategories && (
                        <div className="pl-4 space-y-1 mt-2">
                          {category.subcategories.map((subcategory: Subcategory) => (
                            <Link
                              key={subcategory.href}
                              href={subcategory.href}
                              className="flex items-center justify-between py-2 text-sm text-gray-600 hover:text-purple-600 transition-colors"
                              onClick={() => {
                                setIsMenuOpen(false)
                                setMobileCategoriesOpen({})
                              }}
                            >
                              <span>{subcategory.name}</span>
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                {categoryCounts[subcategory.key] || 0}
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
                    className="block py-2 text-sm text-gray-700 hover:text-purple-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                )
              })}
              {/* Extra pages for mobile (not shown in desktop nav) */}
              <Link
                href="/hakkimizda"
                className="block py-2 text-sm text-gray-700 hover:text-purple-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Hakkımızda
              </Link>
              <Link
                href="/iletisim"
                className="block py-2 text-sm text-gray-700 hover:text-purple-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                İletişim
              </Link>
            </div>

            {/* Mobile actions */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <Link
                href="/favorilerim"
                className="flex items-center space-x-2 w-full py-2 text-sm text-gray-700 hover:text-purple-600"
                onClick={() => setIsMenuOpen(false)}
              >
                <Heart className="w-5 h-5" />
                <span>Favoriler{favoritesCount > 0 ? ` (${favoritesCount})` : ''}</span>
              </Link>
              {user ? (
                <Link
                  href="/hesabim"
                  className="flex items-center space-x-2 w-full py-2 text-sm text-gray-700 hover:text-purple-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  <span>Hesabım</span>
                </Link>
              ) : (
                <Link
                  href="/giris"
                  className="flex items-center space-x-2 w-full py-2 text-sm text-gray-700 hover:text-purple-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  <span>Giriş Yap</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
