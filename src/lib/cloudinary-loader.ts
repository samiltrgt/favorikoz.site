/**
 * Next.js custom image loader.
 *
 * - Cloudinary URL'leri için responsive dönüşüm uygular (w, q_auto, f_auto, dpr_auto)
 * - Diğer URL'leri olduğu gibi döndürür
 * - Vercel image optimizer kotasını kullanmaz
 */
type ImageLoaderParams = { src: string; width: number; quality?: number }
import optimizedImages from '@/data/optimized-images.json'

type ImageVariant = { width: number; path: string }
const derivatives: Record<string, ImageVariant[]> = optimizedImages

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderParams): string {
  if (!src) return src
  const variants = derivatives[src]
  if (variants?.length) return (variants.find(variant => variant.width >= width) || variants[variants.length - 1]).path
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
