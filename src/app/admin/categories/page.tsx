'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2,
  Folder,
  FolderOpen,
  X,
  Save,
  AlertCircle
} from 'lucide-react'

interface Category {
  slug: string
  name: string
  description?: string
  parent_slug?: string
  deleted_at?: string
  subcategories?: Category[]
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent_slug: ''
  })

  // Load categories
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/categories')
      const result = await response.json()
      
      if (result.success) {
        setCategories(result.data || [])
      } else {
        setError('Kategoriler yüklenirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      setError('Kategoriler yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parent_slug: category.parent_slug || ''
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        slug: '',
        description: '',
        parent_slug: ''
      })
    }
    setIsModalOpen(true)
    setError(null)
    setSuccess(null)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      parent_slug: ''
    })
    setError(null)
    setSuccess(null)
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: editingCategory ? formData.slug : generateSlug(name)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      if (editingCategory) {
        // Update category
        const updateData: any = {
          name: formData.name,
          description: formData.description || null,
          parent_slug: formData.parent_slug || null
        }

        // Only update slug if it changed
        if (formData.slug !== editingCategory.slug) {
          updateData.new_slug = formData.slug
        }

        const response = await fetch(`/api/admin/categories/${editingCategory.slug}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })

        const result = await response.json()

        if (result.success) {
          setSuccess('Kategori başarıyla güncellendi')
          loadCategories()
          setTimeout(() => {
            handleCloseModal()
          }, 1000)
        } else {
          setError(result.error || 'Kategori güncellenirken bir hata oluştu')
        }
      } else {
        // Create category
        const response = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            parent_slug: formData.parent_slug || null
          })
        })

        const result = await response.json()

        if (result.success) {
          setSuccess('Kategori başarıyla oluşturuldu')
          loadCategories()
          setTimeout(() => {
            handleCloseModal()
          }, 1000)
        } else {
          setError(result.error || 'Kategori oluşturulurken bir hata oluştu')
        }
      }
    } catch (error) {
      console.error('Error saving category:', error)
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    }
  }

  const handleDelete = async (category: Category) => {
    if (!confirm(`"${category.name}" kategorisini silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/categories/${category.slug}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Kategori başarıyla silindi')
        loadCategories()
      } else {
        setError(result.error || 'Kategori silinirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    }
  }

  const toggleExpand = (slug: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(slug)) {
      newExpanded.delete(slug)
    } else {
      newExpanded.add(slug)
    }
    setExpandedCategories(newExpanded)
  }

  // Get all main categories for parent selection
  const getMainCategories = (): Category[] => {
    return categories.filter(cat => !cat.parent_slug)
  }

  // Get all categories (flat) for parent selection
  const getAllCategoriesFlat = (cats: Category[]): Category[] => {
    const result: Category[] = []
    cats.forEach(cat => {
      result.push(cat)
      if (cat.subcategories && cat.subcategories.length > 0) {
        result.push(...getAllCategoriesFlat(cat.subcategories))
      }
    })
    return result
  }

  const renderCategory = (category: Category, level: number = 0) => {
    const hasSubcategories = category.subcategories && category.subcategories.length > 0
    const isExpanded = expandedCategories.has(category.slug)
    const indent = level * 24

    return (
      <div key={category.slug} className="border-b border-gray-200">
        <div 
          className="flex items-center justify-between py-3 px-4 hover:bg-gray-50"
          style={{ paddingLeft: `${16 + indent}px` }}
        >
          <div className="flex items-center gap-3 flex-1">
            {hasSubcategories ? (
              <button
                onClick={() => toggleExpand(category.slug)}
                className="text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? (
                  <FolderOpen className="h-5 w-5" />
                ) : (
                  <Folder className="h-5 w-5" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}
            <div className="flex-1">
              <div className="font-medium text-gray-900">{category.name}</div>
              {category.description && (
                <div className="text-sm text-gray-500 mt-1">{category.description}</div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                Slug: {category.slug}
                {category.parent_slug && ` • Alt kategori: ${category.parent_slug}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenModal(category)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Düzenle"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(category)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Sil"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {hasSubcategories && isExpanded && (
          <div>
            {category.subcategories!.map(sub => renderCategory(sub, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategori Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kategorileri ve alt kategorileri yönetin
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Yeni Kategori
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {categories.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              Henüz kategori eklenmemiş. Yeni kategori eklemek için yukarıdaki butonu kullanın.
            </div>
          ) : (
            categories.map(category => renderCategory(category))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleCloseModal} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm">
                      {success}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kategori Adı *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slug *
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        pattern="[a-z0-9-]+"
                        title="Sadece küçük harf, rakam ve tire kullanılabilir"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        URL'de kullanılacak benzersiz tanımlayıcı (örn: tirnak-bakimi)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Açıklama
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ana Kategori (Alt kategori için)
                      </label>
                      <select
                        value={formData.parent_slug}
                        onChange={(e) => setFormData({ ...formData, parent_slug: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Ana Kategori (Alt kategori değil)</option>
                        {getAllCategoriesFlat(categories)
                          .filter(cat => !editingCategory || cat.slug !== editingCategory.slug)
                          .map(cat => (
                            <option key={cat.slug} value={cat.slug}>
                              {cat.name} ({cat.slug})
                            </option>
                          ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Boş bırakılırsa ana kategori olarak oluşturulur
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingCategory ? 'Güncelle' : 'Oluştur'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

