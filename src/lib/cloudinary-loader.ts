/**
 * Next.js custom image loader.
 *
 * - Cloudinary URL'leri için responsive dönüşüm uygular (w, q_auto, f_auto)
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

    // Cloudinary URL format: /<cloud>/<asset_type>/<delivery_type>/<transformations>/<public_id>
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length < 5) return src
    const [cloud, assetType, deliveryType, ...rest] = parts
    if (assetType !== 'image' || deliveryType !== 'upload') return src

    const publicId = rest[rest.length - 1]
    const existingTransforms = rest.slice(0, -1).join(',')
    const responsive = [`f_auto`, `q_${quality ?? 'auto'}`, `w_${Math.max(1, width)}`, 'c_limit'].join(',')
    const mergedTransforms = existingTransforms
      ? `${existingTransforms},${responsive}`
      : responsive
    return `${url.protocol}//${url.host}/${cloud}/${assetType}/${deliveryType}/${mergedTransforms}/${publicId}`
  } catch {
    return src
  }
}
