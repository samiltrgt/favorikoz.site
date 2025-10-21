'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Crown, 
  TrendingUp, 
  Star, 
  ShoppingCart, 
  Heart,
  Award,
  Flame,
  Users,
  Clock,
  ArrowRight,
  Trophy,
  Zap
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'

// Hero Section for Best Sellers
function BestSellersHero() {
  return (
    <div className="relative min-h-[70vh] bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-32 right-20 w-24 h-24 bg-pink-400/20 rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-32 right-1/3 w-28 h-28 bg-orange-400/20 rounded-full blur-xl animate-pulse delay-3000"></div>
      </div>
      
      {/* Floating Icons */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/4 animate-bounce delay-500">
          <Crown className="w-8 h-8 text-yellow-400/60" />
        </div>
        <div className="absolute top-40 right-1/4 animate-bounce delay-1000">
          <Trophy className="w-6 h-6 text-orange-400/60" />
        </div>
        <div className="absolute bottom-40 left-1/3 animate-bounce delay-1500">
          <Star className="w-7 h-7 text-pink-400/60" />
        </div>
        <div className="absolute bottom-20 right-1/5 animate-bounce delay-2000">
          <Flame className="w-6 h-6 text-red-400/60" />
        </div>
      </div>
      
      <div className="container relative z-10 py-20">
        <div className="text-center max-w-5xl mx-auto">
          {/* Main Title with Glow Effect */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent drop-shadow-2xl">
                Çok Satanlar
              </h1>
              <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>
            
            {/* Subtitle with Animation */}
            <div className="space-y-4">
              <p className="text-2xl md:text-3xl font-light text-gray-200 leading-relaxed">
                Müşterilerimizin en çok tercih ettiği
              </p>
              <p className="text-xl md:text-2xl font-medium text-yellow-300 animate-pulse">
                ✨ Kalitesi Kanıtlanmış Ürünler ✨
              </p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white">500+</div>
              </div>
              <p className="text-gray-300 text-sm font-medium">Günlük Satış</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white">10K+</div>
              </div>
              <p className="text-gray-300 text-sm font-medium">Mutlu Müşteri</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white">4.8</div>
              </div>
              <p className="text-gray-300 text-sm font-medium">Ortalama Puan</p>
            </div>
          </div>
          
          {/* Call to Action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-4 rounded-full font-bold text-lg hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 hover:scale-105 shadow-2xl flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Hemen Keşfet
            </button>
            <button className="border-2 border-white/30 text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-white/10 transition-all duration-300 hover:scale-105 backdrop-blur-sm flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Sıralamayı Gör
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg className="w-full h-20 text-white" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="currentColor"></path>
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" fill="currentColor"></path>
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="currentColor"></path>
        </svg>
      </div>
    </div>
  )
}

// Top 3 Best Sellers with special design
function TopThreeProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products')
        const result = await response.json()
        if (result.success) {
          setProducts(result.data || [])
        }
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProducts()
  }, [])

  if (isLoading) {
    return (
      <div className="py-16 bg-gray-50">
        <div className="container">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  const bestSellers = products
    .filter(product => product.is_best_seller)
    .map(product => ({
      ...product,
      salesCount: Math.floor(Math.random() * 500) + 100,
      weeklySales: Math.floor(Math.random() * 50) + 10,
      rank: 0
    }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .map((product, index) => ({ ...product, rank: index + 1 }))
  
  const topThree = bestSellers.slice(0, 3)
  
  return (
    <div className="py-16 bg-gray-50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-black mb-4">En Çok Satan 3 Ürün</h2>
          <p className="text-gray-600">Bu hafta en çok tercih edilen ürünler</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {topThree.map((product, index) => (
            <div 
              key={product.id}
              className={`relative group ${
                index === 0 ? 'md:col-span-1' : 'md:col-span-1'
              }`}
            >
              {/* Rank Badge */}
              <div className="absolute -top-4 -right-4 z-20">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                }`}>
                  {index + 1}
                </div>
              </div>
              
              {/* Product Card */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden group-hover:shadow-2xl transition-all duration-500 transform group-hover:-translate-y-2">
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Sales Badge */}
                  <div className="absolute top-4 left-4">
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Flame className="w-4 h-4" />
                      {product.salesCount} Satış
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex flex-col gap-2">
                      <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                        <Heart className="w-5 h-5 text-black" />
                      </button>
                      <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                        <ShoppingCart className="w-5 h-5 text-black" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600">#{product.rank} En Çok Satan</span>
                  </div>
                  
                  <h3 className="font-bold text-lg text-black mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-gray-500 text-sm mb-3">{product.brand}</p>
                  
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < product.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-500 ml-2">({product.reviewCount})</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-black">₺{(product.price / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      {product.original_price && (
                        <span className="text-lg text-gray-500 line-through">₺{(product.original_price / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Bu hafta</div>
                      <div className="font-bold text-green-600">+{product.weeklySales} satış</div>
                    </div>
                  </div>
                  
                  <button className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Hemen Al
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Category-based Best Sellers
function CategoryBestSellers() {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products')
        const result = await response.json()
        if (result.success) {
          setProducts(result.data || [])
        }
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProducts()
  }, [])

  if (isLoading) {
    return (
      <div className="py-16 bg-white">
        <div className="container">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  const categories = [
    { id: 'protez-tirnak', name: 'Protez Tırnak', slug: 'protez-tirnak' },
    { id: 'kisisel-bakim', name: 'Kişisel Bakım', slug: 'kisisel-bakim' },
    { id: 'makyaj', name: 'Makyaj', slug: 'makyaj' },
    { id: 'sac-bakimi', name: 'Saç Bakımı', slug: 'sac-bakimi' },
    { id: 'ipek-kirpik', name: 'İpek Kirpik', slug: 'ipek-kirpik' },
    { id: 'kalici-makyaj', name: 'Kalıcı Makyaj', slug: 'kalici-makyaj' },
    { id: 'erkek-bakim', name: 'Erkek Bakım', slug: 'erkek-bakim' },
    { id: 'kuafor-guzellik', name: 'Kuaför & Güzellik', slug: 'kuafor-guzellik' }
  ]
  
  const categoryBestSellers = categories.reduce((acc, category) => {
    acc[category.id] = products
      .filter(p => p.category === category.id && p.isBestSeller)
      .slice(0, 3)
    return acc
  }, {} as Record<string, any[]>)
  return (
    <div className="py-16 bg-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-black mb-4">Kategori Bazında Çok Satanlar</h2>
          <p className="text-gray-600">Her kategoride en popüler ürünler</p>
        </div>
        
        <div className="space-y-16">
          {Object.entries(categoryBestSellers).map(([categoryId, products]) => {
            const category = categories.find(c => c.id === categoryId)
            if (!category || !Array.isArray(products) || products.length === 0) return null
            
            return (
              <div key={categoryId} className="bg-gray-50 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-black">{category.name}</h3>
                    <p className="text-gray-600">Bu kategoride en çok satan ürünler</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {products.map((product, index) => (
                    <div key={product.id} className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
                      <div className="flex items-start gap-4">
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover rounded-lg"
                          />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-bold text-black text-sm mb-1 line-clamp-2">{product.name}</h4>
                          <p className="text-gray-500 text-xs mb-2">{product.brand}</p>
                          
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < product.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-xs text-gray-500 ml-1">({product.reviewCount})</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-black">₺{(product.price / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              {product.original_price && (
                                <span className="text-sm text-gray-500 line-through">₺{(product.original_price / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">{product.salesCount} satış</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="text-center mt-6">
                  <Link 
                    href={`/kategori/${category.slug}`}
                    className="inline-flex items-center gap-2 text-black font-medium hover:text-gray-600 transition-colors"
                  >
                    Tüm {category.name} Ürünleri
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// All Best Sellers Grid
function AllBestSellers() {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products')
        const result = await response.json()
        if (result.success) {
          setProducts(result.data || [])
        }
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProducts()
  }, [])

  if (isLoading) {
    return (
      <div className="py-16 bg-gray-50">
        <div className="container">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  const bestSellers = products
    .filter(product => product.is_best_seller)
    .map(product => ({
      ...product,
      salesCount: Math.floor(Math.random() * 500) + 100,
      weeklySales: Math.floor(Math.random() * 50) + 10,
      rank: 0
    }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .map((product, index) => ({ ...product, rank: index + 1 }))
  return (
    <div className="py-16 bg-gray-50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-black mb-4">Tüm Çok Satanlar</h2>
          <p className="text-gray-600">En popüler ürünlerimizin tam listesi</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {bestSellers.map((product, index) => (
            <div key={product.id} className="bg-white rounded-xl overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Rank Badge */}
                <div className="absolute top-3 left-3">
                  <div className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                    {product.rank}
                  </div>
                </div>
                
                {/* Sales Badge */}
                <div className="absolute top-3 right-3">
                  <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {product.salesCount}
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-black text-sm mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-gray-500 text-xs mb-2">{product.brand}</p>
                
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < product.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">({product.reviewCount})</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black">₺{(product.price / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {product.original_price && (
                      <span className="text-sm text-gray-500 line-through">₺{(product.original_price / 10).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Stats Section
function StatsSection() {
  const stats = [
    { icon: Users, label: 'Mutlu Müşteri', value: '10,000+', color: 'text-blue-500' },
    { icon: TrendingUp, label: 'Toplam Satış', value: '50,000+', color: 'text-green-500' },
    { icon: Star, label: 'Ortalama Puan', value: '4.8', color: 'text-yellow-500' },
    { icon: Clock, label: 'Hızlı Teslimat', value: '24 Saat', color: 'text-purple-500' },
  ]
  
  return (
    <div className="py-16 bg-black text-white">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold mb-2">{stat.value}</div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BestSellersPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <BestSellersHero />
      <TopThreeProducts />
      <CategoryBestSellers />
      <AllBestSellers />
      <StatsSection />
      <Footer />
    </div>
  )
}
