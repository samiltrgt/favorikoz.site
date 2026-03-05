/**
 * Next.js custom image loader.
 *
 * Tüm ürün görselleri Cloudinary'e upload edildikten sonra,
 * bu loader sadece src'yi geri döndürür. Böylece:
 * - Vercel Image Optimization kullanılmaz (kota harcanmaz),
 * - Cloudinary URL'leri doğrudan kullanılır (transform'lar Cloudinary tarafında).
 */
type ImageLoaderParams = { src: string; width: number; quality?: number }

export default function cloudinaryLoader({ src }: ImageLoaderParams): string {
  // Relative, data veya harici URL fark etmeksizin src olduğu gibi döner.
  // Ürün görselleri için src artık Cloudinary URL olduğu için
  // ekstra image/fetch kullanılmasına gerek yok.
  return src
}
