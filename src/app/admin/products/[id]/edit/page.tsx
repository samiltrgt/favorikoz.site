'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import ImageUpload from '@/components/image-upload'

interface Product {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  originalPrice?: number
  description: string
  category: string
  isNew: boolean
  isBestSeller: boolean
  inStock: boolean
  stock_quantity: number
  image: string
  images: string[]
  barcode: string
  rating: number
  reviews: number
  createdAt: string
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    price: '',
    originalPrice: '',
    description: '',
    category: '',
    isNew: false,
    isBestSeller: false,
    inStock: true,
    stockQuantity: '',
    image: '',
    images: [] as string[],
    barcode: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const categories = [
    { value: 'kisisel-bakim', label: 'Kişisel Bakım', color: 'bg-blue-100 text-blue-800' },
    { value: 'sac-bakimi', label: 'Saç Bakımı', color: 'bg-green-100 text-green-800' },
    { value: 'protez-tirnak', label: 'Protez Tırnak', color: 'bg-purple-100 text-purple-800' },
    { value: 'makyaj', label: 'Makyaj', color: 'bg-pink-100 text-pink-800' },
  ]

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/products/${params.id}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          const foundProduct = result.data
          setProduct(foundProduct)
          setFormData({
            name: foundProduct.name,
            brand: foundProduct.brand,
            price: foundProduct.price.toString(),
            originalPrice: foundProduct.originalPrice?.toString() || '',
            description: foundProduct.description || '',
            category: foundProduct.category,
            isNew: foundProduct.isNew,
            isBestSeller: foundProduct.isBestSeller,
            inStock: foundProduct.inStock,
            stockQuantity: foundProduct.stock_quantity?.toString() || '300',
            image: foundProduct.image,
            images: foundProduct.images || [],
            barcode: foundProduct.barcode || '',
          })
        }
      } catch (error) {
        console.error('Error loading product:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProduct()
  }, [params.id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleMainImageUpload = (url: string) => {
    setFormData(prev => ({
      ...prev,
      image: url
    }))
  }

  const handleAdditionalImagesUpload = (url: string) => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, url]
    }))
  }

  const handleRemoveAdditionalImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          brand: formData.brand,
          price: parseFloat(formData.price),
          originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
          description: formData.description,
          category: formData.category,
          isNew: formData.isNew,
          isBestSeller: formData.isBestSeller,
          inStock: formData.inStock,
          stock_quantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : 300,
          image: formData.image,
          images: formData.images,
          barcode: formData.barcode,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        router.push('/admin/products')
      } else {
        alert('Ürün güncellenirken hata oluştu: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Ürün güncellenirken hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      setIsSubmitting(true)
      
      try {
        const response = await fetch(`/api/products/${params.id}`, {
          method: 'DELETE',
        })
        
        const result = await response.json()
        
        if (result.success) {
          router.push('/admin/products')
        } else {
          alert('Ürün silinirken hata oluştu: ' + result.error)
        }
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Ürün silinirken hata oluştu')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ürün yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ürün Bulunamadı</h1>
          <p className="text-gray-600 mb-8">Aradığınız ürün mevcut değil.</p>
          <Link
            href="/admin/products"
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ürünlere Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Ürün Düzenle
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {product.name}
              </p>
            </div>
            <div className="mt-4 flex space-x-3 md:ml-4 md:mt-0">
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
              >
                <Trash2 className="-ml-0.5 mr-2 h-4 w-4" />
                Sil
              </button>
              <Link
                href="/admin/products"
                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <ArrowLeft className="-ml-0.5 mr-2 h-4 w-4" />
                Geri Dön
              </Link>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ürün Adı *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="Ürün adını girin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marka *
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="Marka adını girin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ürün Kodu
                    </label>
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent font-mono"
                      placeholder="FK000001 veya barkod numarası"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Boş bırakılırsa otomatik kod oluşturulur
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kategori *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white"
                    >
                      <option value="" disabled>Kategori seçin</option>
                      {categories.map((category) => (
                        <option 
                          key={category.value} 
                          value={category.value}
                          selected={formData.category === category.value}
                        >
                          {category.label}
                        </option>
                      ))}
                    </select>
                    {formData.category && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-gray-600">Seçili kategori:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categories.find(c => c.value === formData.category)?.color}`}>
                          {categories.find(c => c.value === formData.category)?.label}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fiyat *
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Eski Fiyat (Opsiyonel)
                      </label>
                      <input
                        type="number"
                        name="originalPrice"
                        value={formData.originalPrice}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stok Miktarı *
                    </label>
                    <input
                      type="number"
                      name="stockQuantity"
                      value={formData.stockQuantity}
                      onChange={handleInputChange}
                      required
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <input
                        id="inStock"
                        name="inStock"
                        type="checkbox"
                        checked={formData.inStock}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <label htmlFor="inStock" className="ml-2 block text-sm text-gray-900">
                        Stokta Var
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="isNew"
                        name="isNew"
                        type="checkbox"
                        checked={formData.isNew}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <label htmlFor="isNew" className="ml-2 block text-sm text-gray-900">
                        Yeni Ürün
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="isBestSeller"
                        name="isBestSeller"
                        type="checkbox"
                        checked={formData.isBestSeller}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <label htmlFor="isBestSeller" className="ml-2 block text-sm text-gray-900">
                        Çok Satan
                      </label>
                    </div>
                  </div>
                </div>

                {/* Description & Images */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ürün Açıklaması
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="Ürün hakkında detaylı bilgi girin..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ana Ürün Görseli *
                    </label>
                    <ImageUpload
                      onUpload={handleMainImageUpload}
                      currentImage={formData.image}
                      folder="products"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ek Görseller ({formData.images.length})
                    </label>
                    <ImageUpload
                      onUpload={handleAdditionalImagesUpload}
                      folder="products"
                    />
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      {formData.images.map((img, index) => (
                        <div key={index} className="relative w-full aspect-square rounded-md overflow-hidden group">
                          <Image src={img} alt={`Ek görsel ${index + 1}`} fill className="object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveAdditionalImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                      Değişiklikleri Kaydet
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
