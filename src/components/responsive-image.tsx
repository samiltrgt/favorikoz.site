/* eslint-disable @next/next/no-img-element */
import Image, { type ImageProps } from 'next/image'
import { responsiveImage } from '@/lib/responsive-image'

/** Local derivatives use their real encoded widths, rather than Next's configured widths. */
export default function ResponsiveImage({ src, fill, priority, fetchPriority, loading, style, quality, loader, unoptimized, placeholder, blurDataURL, onLoadingComplete, ...props }: ImageProps) {
  const responsive = typeof src === 'string' ? responsiveImage(src) : null
  if (!responsive) {
    const transformed = typeof src === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(src)
    return <Image {...props} src={src} fill={fill} priority={priority} fetchPriority={fetchPriority} loading={loading} style={style} quality={quality} loader={loader} unoptimized={unoptimized || !transformed} placeholder={placeholder} blurDataURL={blurDataURL} onLoadingComplete={onLoadingComplete} />
  }
  return <img
    {...props}
    {...responsive}
    width={fill ? undefined : props.width}
    height={fill ? undefined : props.height}
    sizes={props.sizes || (fill ? '100vw' : `${props.width || 960}px`)}
    loading={priority ? 'eager' : loading || 'lazy'}
    // React 18 requires the native lowercase attribute; Next handles its own compatibility.
    {...{ fetchpriority: priority ? 'high' : fetchPriority }}
    decoding={props.decoding || 'async'}
    style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style } : style}
    onLoad={event => { props.onLoad?.(event); onLoadingComplete?.(event.currentTarget) }}
  />
}
