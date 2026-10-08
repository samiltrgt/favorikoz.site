import type { BrandLogo } from '@/components/BrandMarquee'
import { optimizedImageSource } from '@/lib/responsive-image-server'

/**
 * Ana sayfa marka şeridi. `src` yoksa marka adı yazı olarak basılır.
 * Logolar şeffaf ve en fazla 240 piksel WebP; şerit onları beyaza çevirir.
 */
export const siteBrands: BrandLogo[] = [
  { name: 'ElliSan', src: optimizedImageSource('/brands/ellisan.png').split('?')[0] },
  { name: 'Opzia', src: optimizedImageSource('/brands/opzia.png').split('?')[0] },
  { name: 'Runail Professional', src: optimizedImageSource('/brands/runail.png').split('?')[0] },
  { name: 'QNail Professional', src: optimizedImageSource('/brands/qnail.png').split('?')[0] },
  { name: 'Fontenay' },
  { name: 'Dubai Professional', lines: ['Dubai', 'Professional'] },
]

/** Şeffaf logoları şerit zemininde beyaz gösterir. Metin markalarında etkisiz. */
export const brandMarqueeWhiteLogos = true
