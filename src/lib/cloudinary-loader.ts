/**
 * Next.js custom image loader: Supabase (and other external) images are served
 * via Cloudinary fetch (resize, f_auto, q_auto). Vercel Image Optimization
 * quota is not used.
 */
type ImageLoaderParams = { src: string; width: number; quality?: number } // quality unused; Cloudinary uses q_auto

export default function cloudinaryLoader({
  src,
  width,
}: ImageLoaderParams): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) return src

  // Relative or data URLs: return as-is (no Cloudinary)
  if (src.startsWith('/') || src.startsWith('data:')) return src

  // CDN'ler fetch'i 401 ile reddediyor; Cloudinary'den geçirme, doğrudan kullan
  try {
    const u = new URL(src)
    if (u.hostname.includes('dsmcdn.com')) return src
  } catch {
    // URL parse hatası
  }

  const params = ['f_auto', 'q_auto', `w_${width}`]
  const paramsStr = params.join(',')
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${paramsStr}/${encodeURIComponent(src)}`
}
