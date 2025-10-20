import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container py-24 text-center">
      <h1 className="text-2xl font-semibold mb-2">Ürün bulunamadı</h1>
      <p className="text-gray-600 mb-6">Aradığınız ürün kaldırılmış veya bağlantı hatalı olabilir.</p>
      <Link href="/tum-urunler" className="text-black underline">Tüm ürünlere dön</Link>
    </div>
  )
}


