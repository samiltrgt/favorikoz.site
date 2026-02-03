'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) setSent(true)
      else setError(data.error || 'Bir hata oluştu.')
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Şifremi unuttum</h1>
              <p className="text-gray-600">E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.</p>
            </div>
            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-gray-700">E-posta gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.</p>
                <Link href="/giris" className="inline-block text-black font-semibold hover:underline">Giriş sayfasına dön</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="ornek@email.com"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {isLoading ? 'Gönderiliyor...' : 'Sıfırlama bağlantısı gönder'}
                </button>
              </form>
            )}
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
