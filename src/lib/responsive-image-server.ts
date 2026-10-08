import 'server-only'
import optimizedImages from '@/data/optimized-images.json'

type ImageVariants = { hash: string; widths: number[] }
const manifest: Record<string, ImageVariants> = optimizedImages

/** Resolve only a page's image sources on the server; the catalog map never enters client JS. */
export function optimizedImageSource(src: string): string {
  const entry = manifest[src]
  if (!entry?.widths.length) return src
  return `/seo-images/${entry.hash}-${entry.widths[entry.widths.length - 1]}.webp?widths=${entry.widths.join(',')}`
}
