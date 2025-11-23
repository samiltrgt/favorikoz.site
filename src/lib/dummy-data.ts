import { importedProducts } from '@/lib/imported-products'

// Dummy products with barcodes
const baseDummyProducts = [
  {
    id: '1',
    slug: 'staleks-protez-tirnak-seti-profesyonel',
    name: 'Staleks Protez Tırnak Seti Profesyonel',
    brand: 'Staleks',
    price: 1250.00,
    originalPrice: 180.00,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    rating: 4.8,
    reviews: 156,
    isNew: true,
    isBestSeller: true,
    discount: 30,
    inStock: true,
    category: 'protez-tirnak',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    slug: 'microneedle-dermaroller-0-5mm',
    name: 'Microneedle Dermaroller 0.5mm Cilt Bakımı',
    brand: 'Microneedle',
    price: 89.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    rating: 4.6,
    reviews: 89,
    isBestSeller: true,
    inStock: true,
    category: 'kisisel-bakim',
    createdAt: '2024-01-10'
  },
  {
    id: '3',
    slug: 'ipek-kirpik-extension-set',
    name: 'İpek Kirpik Extension Set Profesyonel',
    brand: 'LashPro',
    price: 450.00,
    originalPrice: 60.00,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    rating: 4.9,
    reviews: 234,
    discount: 25,
    inStock: true,
    category: 'ipek-kirpik',
    createdAt: '2024-01-20'
  },
  {
    id: '4',
    slug: 'permanent-makeup-machine',
    name: 'Kalıcı Makyaj Makinesi Profesyonel',
    brand: 'BeautyTech',
    price: 2800.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    rating: 4.7,
    reviews: 67,
    isNew: true,
    inStock: true,
    category: 'kalici-makyaj',
    createdAt: '2024-01-25'
  },
  {
    id: '5',
    slug: 'hair-straightener-professional',
    name: 'Saç Düzleştirici Profesyonel 220V',
    brand: 'HairMaster',
    price: 890.00,
    originalPrice: 120.00,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    rating: 4.5,
    reviews: 123,
    discount: 26,
    inStock: false,
    category: 'sac-bakimi',
    createdAt: '2024-01-05'
  },
  {
    id: '6',
    slug: 'makeup-brush-set-15-piece',
    name: 'Makyaj Fırçası Seti 15 Parça Profesyonel',
    brand: 'MakeupPro',
    price: 320.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    rating: 4.4,
    reviews: 78,
    isBestSeller: true,
    inStock: true,
    category: 'ipek-kirpik',
    createdAt: '2024-01-12'
  },
  {
    id: '7',
    slug: 'beard-trimmer-men',
    name: 'Sakal Tıraş Makinesi Erkek Bakım',
    brand: 'MenCare',
    price: 180.00,
    originalPrice: 25.00,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    rating: 4.3,
    reviews: 45,
    discount: 28,
    inStock: true,
    category: 'erkek-bakim',
    createdAt: '2024-01-08'
  },
  {
    id: '8',
    slug: 'nail-art-gel-polish-set',
    name: 'Tırnak Sanatı Jel Oje Seti 12 Renk',
    brand: 'NailArt',
    price: 95.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    rating: 4.6,
    reviews: 112,
    isNew: true,
    inStock: true,
    category: 'protez-tirnak',
    createdAt: '2024-01-22'
  },
  {
    id: '9',
    slug: 'facial-steamer-professional',
    name: 'Yüz Buharlama Cihazı Profesyonel',
    brand: 'Favori Kozmetik',
    price: 450.00,
    originalPrice: 65.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    rating: 4.7,
    reviews: 89,
    discount: 31,
    inStock: true,
    category: 'kisisel-bakim',
    createdAt: '2024-01-18'
  },
  {
    id: '10',
    slug: 'eyelash-curler-premium',
    name: 'Premium Kirpik Kıvırıcı Set',
    brand: 'Pro Beauty',
    price: 75.00,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    rating: 4.5,
    reviews: 156,
    isBestSeller: true,
    inStock: true,
    category: 'ipek-kirpik',
    createdAt: '2024-01-14'
  },
  {
    id: '11',
    slug: 'hair-dryer-professional-2200w',
    name: 'Profesyonel Saç Kurutma Makinesi 2200W',
    brand: 'Elite Tools',
    price: 1200.00,
    originalPrice: 160.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    rating: 4.8,
    reviews: 203,
    discount: 25,
    inStock: true,
    category: 'sac-bakimi',
    createdAt: '2024-01-16'
  },
  {
    id: '12',
    slug: 'microblading-pen-set',
    name: 'Microblading Kalem Seti 5 Parça',
    brand: 'Staleks',
    price: 280.00,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    rating: 4.6,
    reviews: 67,
    isNew: true,
    inStock: true,
    category: 'kalici-makyaj',
    createdAt: '2024-01-28'
  },
  {
    id: '13',
    slug: 'nail-drill-machine-professional',
    name: 'Profesyonel Tırnak Freze Makinesi',
    brand: 'Dexter',
    price: 850.00,
    originalPrice: 110.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    rating: 4.9,
    reviews: 134,
    discount: 23,
    inStock: true,
    category: 'protez-tirnak',
    createdAt: '2024-01-11'
  },
  {
    id: '14',
    slug: 'eyebrow-tint-kit',
    name: 'Kaş Boyama Seti Doğal Renkler',
    brand: 'Pro Beauty',
    price: 120.00,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    rating: 4.4,
    reviews: 78,
    inStock: true,
    category: 'kalici-makyaj',
    createdAt: '2024-01-09'
  },
  {
    id: '15',
    slug: 'lash-extension-tools-set',
    name: 'Kirpik Extension Alet Seti 12 Parça',
    brand: 'LashPro',
    price: 320.00,
    originalPrice: 45.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    rating: 4.7,
    reviews: 98,
    discount: 29,
    inStock: true,
    category: 'ipek-kirpik',
    createdAt: '2024-01-13'
  },
  {
    id: '16',
    slug: 'facial-massage-roller',
    name: 'Yüz Masaj Rulosu Jade Stone',
    brand: 'Favori Kozmetik',
    price: 65.00,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    rating: 4.3,
    reviews: 45,
    isNew: true,
    inStock: true,
    category: 'kisisel-bakim',
    createdAt: '2024-01-26'
  },
  {
    id: '17',
    slug: 'hair-color-mixing-bowl',
    name: 'Saç Boyası Karıştırma Kabı Seti',
    brand: 'Elite Tools',
    price: 35.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    rating: 4.2,
    reviews: 23,
    inStock: true,
    category: 'sac-bakimi',
    createdAt: '2024-01-07'
  },
  {
    id: '18',
    slug: 'makeup-sponge-set-premium',
    name: 'Premium Makyaj Süngeri Seti 6 Parça',
    brand: 'MakeupPro',
    price: 85.00,
    originalPrice: 12.00,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    rating: 4.6,
    reviews: 167,
    discount: 29,
    isBestSeller: true,
    inStock: true,
    category: 'ipek-kirpik',
    createdAt: '2024-01-19'
  },
  {
    id: '19',
    slug: 'men-skincare-set',
    name: 'Erkek Cilt Bakım Seti 3 Parça',
    brand: 'MenCare',
    price: 150.00,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    rating: 4.4,
    reviews: 56,
    inStock: true,
    category: 'erkek-bakim',
    createdAt: '2024-01-17'
  },
  {
    id: '20',
    slug: 'salon-sterilizer-machine',
    name: 'Salon Sterilizasyon Cihazı UV',
    brand: 'BeautyTech',
    price: 2200.00,
    originalPrice: 280.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    rating: 4.8,
    reviews: 45,
    discount: 21,
    inStock: true,
    category: 'kuafor-guzellik',
    createdAt: '2024-01-21'
  }
]

// Export as products for the all products page (merge imported Excel products)
// Add barcodes and images to dummy products
const dummyProducts = baseDummyProducts.map((product, index) => ({
  ...product,
  barcode: `FK${String(index + 1).padStart(6, '0')}`,
  images: [] // Dummy products don't have additional images
}))

export const products = [...dummyProducts, ...importedProducts]

// Best sellers with sales data
export const bestSellers = products
  .filter(product => product.isBestSeller)
  .map(product => ({
    ...product,
    salesCount: Math.floor(Math.random() * 500) + 100, // 100-600 arası satış
    weeklySales: Math.floor(Math.random() * 50) + 10,  // Haftalık satış
    rank: 0 // Sıralama
  }))
  .sort((a, b) => b.salesCount - a.salesCount)
  .map((product, index) => ({ ...product, rank: index + 1 }))

// Category-based best sellers
export const categoryBestSellers = {
  'protez-tirnak': bestSellers.filter(p => p.category === 'protez-tirnak').slice(0, 3),
  'kisisel-bakim': bestSellers.filter(p => p.category === 'kisisel-bakim').slice(0, 3),
  'ipek-kirpik': bestSellers.filter(p => p.category === 'ipek-kirpik').slice(0, 3),
  'sac-bakimi': bestSellers.filter(p => p.category === 'sac-bakimi').slice(0, 3),
  'ipek-kirpik': bestSellers.filter(p => p.category === 'ipek-kirpik').slice(0, 3),
  'kalici-makyaj': bestSellers.filter(p => p.category === 'kalici-makyaj').slice(0, 3),
  'erkek-bakim': bestSellers.filter(p => p.category === 'erkek-bakim').slice(0, 3),
  'kuafor-guzellik': bestSellers.filter(p => p.category === 'kuafor-guzellik').slice(0, 3),
}

export const categories = [
  {
    id: 'protez-tirnak',
    name: 'Protez Tırnak',
    slug: 'protez-tirnak',
    description: 'Profesyonel protez tırnak ürünleri ve ekipmanları',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop',
    productCount: 45
  },
  {
    id: 'kalici-makyaj',
    name: 'Kalıcı Makyaj & Microblading',
    slug: 'kalici-makyaj',
    description: 'Kalıcı makyaj ve microblading profesyonel ürünleri',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop',
    productCount: 32
  },
  {
    id: 'kisisel-bakim',
    name: 'Kişisel Bakım',
    slug: 'kisisel-bakim',
    description: 'Cilt bakımı ve kişisel bakım ürünleri',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop',
    productCount: 67
  },
  {
    id: 'ipek-kirpik',
    name: 'İpek Kirpik',
    slug: 'ipek-kirpik',
    description: 'Doğal görünümlü ipek kirpik ürünleri',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop',
    productCount: 89
  },
  {
    id: 'sac-bakimi',
    name: 'Saç Bakımı',
    slug: 'sac-bakimi',
    description: 'Saç bakımı ve şekillendirme ürünleri',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop',
    productCount: 54
  },
  {
    id: 'erkek-bakim',
    name: 'Erkek Bakım',
    slug: 'erkek-bakim',
    description: 'Erkek bakım ve tıraş ürünleri',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop',
    productCount: 23
  },
  {
    id: 'kuafor-guzellik',
    name: 'Kuaför & Güzellik Merkezleri',
    slug: 'kuafor-guzellik',
    description: 'Profesyonel kuaför ve güzellik merkezi ekipmanları',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop',
    productCount: 76
  }
]

export const featuredProducts = products.filter(product => 
  product.isBestSeller || product.isNew
).slice(0, 8)

export const newProducts = products.filter(product => 
  product.isNew
).slice(0, 4)

export const bestSellersSimple = products.filter(product =>
  product.isBestSeller
).slice(0, 4)