/**
 * Next.js custom image loader.
 *
 * - Cloudinary URL'leri için responsive dönüşüm uygular (w, q_auto, f_auto, dpr_auto)
 * - Diğer URL'leri olduğu gibi döndürür
 * - Vercel image optimizer kotasını kullanmaz
 */
type ImageLoaderParams = { src: string; width: number; quality?: number }

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderParams): string {
  if (!src) return src
  if (src.startsWith('/') || src.startsWith('data:')) return src

  try {
    const url = new URL(src)
    const isCloudinary = url.hostname.includes('res.cloudinary.com')
    if (!isCloudinary) return src
    if (!url.pathname.includes('/image/upload/')) return src

    const responsive = `f_auto,dpr_auto,q_${quality ?? 'auto'},w_${Math.max(1, width)},c_limit`
    const transformedPath = url.pathname.replace('/image/upload/', `/image/upload/${responsive}/`)
    return `${url.protocol}//${url.host}${transformedPath}`
  } catch {
    return src
  }
}
