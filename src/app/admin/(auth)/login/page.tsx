"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.message || 'Email veya şifre hatalı')
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-900">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Paneli
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Yönetim paneline erişim için giriş yapın
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email Adresi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                  placeholder="Email adresi"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                  placeholder="Şifre"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                    <div className="rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  </div>
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-md">
              <strong>⚠️ Önemli:</strong> Admin kullanıcısını Supabase Dashboard'dan oluşturun
              <div className="mt-2 text-xs text-gray-500">
                1. Supabase Dashboard → Authentication → Users<br/>
                2. Create New User (email + password)<br/>
                3. SQL Editor'da çalıştırın:<br/>
                <code className="bg-gray-100 px-2 py-1 rounded">
                  UPDATE profiles SET role='admin' WHERE email='[email]'
                </code>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}



