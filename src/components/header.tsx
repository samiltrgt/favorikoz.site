'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ShoppingCart, Heart, User, Menu, X, ChevronDown } from 'lucide-react'
import { getCart } from '@/lib/cart'

const staticCategories = [
  { name: 'Anasayfa', href: '/' },
  { name: 'Tüm Ürünler', href: '/tum-urunler' },
  { name: 'Çok Satanlar', href: '/cok-satanlar' },
  { 
    name: 'Kategoriler', 
    href: '#',
    hasDropdown: true,
    subcategories: [
      { name: 'Kişisel Bakım', href: '/kategori/kisisel-bakim', key: 'kisisel-bakim' },
      { name: 'Saç Bakımı', href: '/kategori/sac-bakimi', key: 'sac-bakimi' },
      { name: 'Protez Tırnak', href: '/kategori/protez-tirnak', key: 'protez-tirnak' },
      { name: 'Makyaj', href: '/kategori/makyaj', key: 'makyaj' },
    ]
  },
  { name: 'Hakkımızda', href: '/hakkimizda' },
  { name: 'İletişim', href: '/iletisim' },
]

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})

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

  // Load category counts dynamically from API so edits reflect in header
  useEffect(() => {
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
          setCategoryCounts(counts)
        }
      } catch {}
    }
    loadCounts()
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      {/* Top bar */}
      <div className="bg-gray-50 py-2">
        <div className="container">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>📞 0537 647 07 17</span>
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
           <div className="hidden lg:flex flex-1 max-w-md mx-8">
             <div className="relative w-full">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
               <input
                 type="text"
                 placeholder="Ürün ara..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border-b border-gray-300 bg-transparent focus:outline-none focus:border-black text-sm tracking-wide"
               />
             </div>
           </div>

                     {/* Actions */}
           <div className="flex items-center space-x-6">
             <button className="text-gray-600 hover:text-gray-900">
               <Search className="w-5 h-5" />
             </button>
             
             <button className="text-gray-600 hover:text-gray-900">
               <User className="w-5 h-5" />
             </button>
             
             <button className="text-gray-600 hover:text-gray-900">
               <Heart className="w-5 h-5" />
             </button>
             
             <Link href="/sepet" className="text-gray-600 hover:text-gray-900 relative">
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
            {staticCategories.map((category) => (
               <div 
                 key={category.name}
                 className="relative"
                 onMouseEnter={() => category.hasDropdown && setHoveredCategory(category.name)}
                 onMouseLeave={() => category.hasDropdown && setHoveredCategory(null)}
               >
                 {category.hasDropdown ? (
                   <button className="flex items-center gap-1 text-sm font-light text-black hover:text-gray-600 active:scale-95 transition-all duration-200 tracking-wide py-2">
                     {category.name}
                     <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${hoveredCategory === category.name ? 'rotate-180' : ''}`} />
                   </button>
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
                     <div className="absolute top-full left-0 w-80 h-2 bg-transparent"></div>
                     
                     <div className="absolute top-full left-0 mt-2 w-80 bg-white shadow-xl border border-gray-200 rounded-lg p-6 z-50 animate-slide-in-up">
                       <div className="grid grid-cols-1 gap-2">
                         {category.subcategories?.map((subcategory, index) => (
                           <Link
                             key={subcategory.href}
                             href={subcategory.href}
                             className="text-sm text-gray-700 hover:text-black hover:bg-gray-50 active:scale-95 px-3 py-3 rounded transition-all duration-200 animate-fade-in-up flex items-center justify-between"
                             style={{ animationDelay: `${index * 50}ms` }}
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
        <div className="lg:hidden bg-white border-t border-gray-200">
          <div className="container py-4">
            {/* Mobile search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Ürün, kategori veya marka ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Mobile categories */}
            <div className="space-y-2">
              {staticCategories.map((category) => (
                <Link
                  key={category.href}
                  href={category.href}
                  className="block py-2 text-sm text-gray-700 hover:text-purple-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
            </div>

            {/* Mobile actions */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <button className="flex items-center space-x-2 w-full py-2 text-sm text-gray-700 hover:text-purple-600">
                <Heart className="w-5 h-5" />
                <span>Favoriler</span>
              </button>
              <button className="flex items-center space-x-2 w-full py-2 text-sm text-gray-700 hover:text-purple-600">
                <User className="w-5 h-5" />
                <span>Hesabım</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
