import Link from 'next/link'
import { Mail, Phone, MapPin, Instagram } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white flex items-center justify-center">
                <span className="text-black font-bold text-lg tracking-wider">F</span>
              </div>
              <h3 className="text-xl font-light tracking-wide">FAVORI KOZMETIK</h3>
            </div>
            <p className="text-gray-300 text-sm">
              Premium kozmetik ürünleri ile güzelliğinizi keşfedin. 
              Güvenilir, kaliteli ve uygun fiyatlı ürünler için doğru adres.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/favorikozmetik/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Hızlı Linkler</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/hakkimizda" className="text-gray-300 hover:text-white transition-colors">
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link href="/iletisim" className="text-gray-300 hover:text-white transition-colors">
                  İletişim
                </Link>
              </li>
              <li>
                <Link href="/kargo-iade" className="text-gray-300 hover:text-white transition-colors">
                  Kargo & İade
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Kategoriler</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/kategori/tirnak" className="text-gray-300 hover:text-white transition-colors">
                  Tırnak
                </Link>
              </li>
              <li>
                <Link href="/kategori/sac-bakimi" className="text-gray-300 hover:text-white transition-colors">
                  Saç Bakımı
                </Link>
              </li>
              <li>
                <Link href="/kategori/kisisel-bakim" className="text-gray-300 hover:text-white transition-colors">
                  Kişisel Bakım
                </Link>
              </li>
              <li>
                <Link href="/kategori/ipek-kirpik" className="text-gray-300 hover:text-white transition-colors">
                  İpek Kirpik
                </Link>
              </li>
              <li>
                <Link href="/kategori/kuafor-malzemeleri" className="text-gray-300 hover:text-white transition-colors">
                  Kuaför Malzemeleri
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">İletişim</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">0537 647 07 10</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">mervesaat@gmail.com</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-gray-300">
                  Tahtakale Mahallesi, Tahtakale Caddesi Çavuşoğlu Han No:24/4<br />
                  Fatih/İstanbul
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-400">
              © 2024 Favori Kozmetik. Tüm hakları saklıdır.
            </div>
            <div className="flex space-x-6 text-sm">
              <Link href="/kvkk" className="text-gray-400 hover:text-white transition-colors">
                KVKK
              </Link>
              <Link href="/gizlilik" className="text-gray-400 hover:text-white transition-colors">
                Gizlilik Politikası
              </Link>
              <Link href="/cerez-politikasi" className="text-gray-400 hover:text-white transition-colors">
                Çerez Politikası
              </Link>
              <Link href="/kullanim-kosullari" className="text-gray-400 hover:text-white transition-colors">
                Kullanım Koşulları
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
