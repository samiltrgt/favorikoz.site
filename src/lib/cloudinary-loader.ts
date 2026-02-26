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

  const params = ['f_auto', 'q_auto', `w_${width}`]
  const paramsStr = params.join(',')
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${paramsStr}/${encodeURIComponent(src)}`
}
