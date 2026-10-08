/**
 * Next.js custom image loader.
 *
 * - Cloudinary URL'leri için responsive dönüşüm uygular (w, q_auto, f_auto, dpr_auto)
 * - Katalog görselleri için önceden üretilmiş yerel WebP boyutlarını seçer
 * - Yeni/bilinmeyen URL'leri olduğu gibi döndürür
 * - Vercel image optimizer kotasını kullanmaz
 */
type ImageLoaderParams = { src: string; width: number; quality?: number }
import { responsiveImage } from '@/lib/responsive-image'

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderParams): string {
  if (!src) return src
  const responsive = responsiveImage(src)
  if (responsive) {
    const variants = responsive.srcSet.split(', ').map(value => ({ path: value.split(' ')[0], width: Number(value.split(' ')[1].slice(0, -1)) }))
    return (variants.find(variant => variant.width >= width) || variants[variants.length - 1]).path
  }
  if (src.startsWith('/') || src.startsWith('data:')) return src

  try {
    const url = new URL(src)
    const isCloudinary = url.hostname === 'res.cloudinary.com'
    if (!isCloudinary) return src
    if (!url.pathname.includes('/image/upload/')) return src

    const responsive = `f_auto,dpr_auto,q_${quality ?? 'auto'},w_${Math.max(1, width)},c_limit`
    const transformedPath = url.pathname.replace('/image/upload/', `/image/upload/${responsive}/`)
    return `${url.protocol}//${url.host}${transformedPath}${url.search}`
  } catch {
    return src
  }
}
