import type { BrandLogo } from '@/components/BrandMarquee'

/**
 * Ana sayfa marka şeridi. `src` yoksa marka adı yazı olarak basılır.
 * Logolar şeffaf PNG; şerit onları beyaza çevirir (`brandMarqueeWhiteLogos`).
 */
export const siteBrands: BrandLogo[] = [
  { name: 'ElliSan', src: '/brands/ellisan.png' },
  { name: 'Opzia', src: '/brands/opzia.png' },
  { name: 'Runail Professional', src: '/brands/runail.png' },
  { name: 'QNail Professional', src: '/brands/qnail.png' },
  { name: 'Fontenay' },
  { name: 'Dubai Professional', lines: ['Dubai', 'Professional'] },
]

/** Şeffaf logoları şerit zemininde beyaz gösterir. Metin markalarında etkisiz. */
export const brandMarqueeWhiteLogos = true
