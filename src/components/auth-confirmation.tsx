'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { completeImplicitEmailLink } from '@/lib/auth-email-link'

export default function AuthConfirmation({ confirmed }: { confirmed: boolean }) {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'confirmed' | 'invalid'>(confirmed ? 'confirmed' : 'loading')
  const attempt = useRef<Promise<'confirmed' | 'recovery' | 'invalid'> | null>(null)
  useEffect(() => {
    let active = true
    const hash = window.location.hash
    if (!hash) { setState(confirmed ? 'confirmed' : 'invalid'); return }
    if (!attempt.current) attempt.current = completeImplicitEmailLink(hash)
    attempt.current.then(result => {
      if (!active) return
      window.history.replaceState(null, '', window.location.pathname)
      if (result === 'recovery') router.replace('/sifre-yenile')
      else setState(result)
    })
    return () => { active = false }
  }, [confirmed, router])
  return <div className="min-h-screen bg-gray-50">
    <Header />
    <main className="container max-w-md pt-24 pb-16">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">{state === 'confirmed' ? 'E-posta adresiniz doğrulandı' : state === 'loading' ? 'Bağlantı doğrulanıyor...' : 'Doğrulama bağlantısı geçersiz'}</h1>
        <p>{state === 'confirmed' ? 'Hesabınızı kullanmaya başlayabilirsiniz.' : state === 'invalid' ? 'Bağlantı daha önce kullanılmış veya süresi dolmuş olabilir. E-posta adresinizi daha önce doğruladıysanız giriş yapabilirsiniz.' : 'Lütfen bekleyin.'}</p>
        {state !== 'loading' && <Link href="/giris" className="block bg-black text-white py-3 rounded-lg font-semibold">Giriş sayfasına git</Link>}
      </div>
    </main>
    <Footer />
  </div>
}
