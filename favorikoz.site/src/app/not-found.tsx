import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h2 className="text-2xl font-light text-black mb-4">404 - Sayfa Bulunamadı</h2>
        <p className="text-gray-600 mb-6">Aradığınız sayfa mevcut değil.</p>
        <Link
          href="/"
          className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  )
}
