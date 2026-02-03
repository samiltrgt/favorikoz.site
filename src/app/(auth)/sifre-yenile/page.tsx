'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.')
      return
    }
    setIsLoading(true)
    try {
      const supabase = createSupabaseClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) {
        setError(err.message)
        return
      }
      alert('Şifreniz güncellendi. Giriş yapabilirsiniz.')
      router.push('/giris')
    } catch {
      setError('Bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container max-w-md mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Yeni şifre belirle</h1>
              <p className="text-gray-600">Hesabınız için yeni bir şifre girin.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yeni şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="En az 6 karakter"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şifre tekrar</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Şifrenizi tekrar girin"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
              >
                {isLoading ? 'Kaydediliyor...' : 'Şifremi güncelle'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <Link href="/giris" className="text-gray-600 hover:text-black text-sm">Giriş sayfasına dön</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
