export type DeviceTier = 'mobile' | 'tablet' | 'desktop'

export const FRAME_CONFIG = {
  basePath: '/frames',
  extension: 'webp',
  padLength: 4,
  posterSrc: '/poster.webp',
  totalSourceFrames: 60,
  preloadCount: 10,
  counts: {
    mobile: 30,
    tablet: 45,
    desktop: 60,
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
  },
} as const

export const SCROLL_CONFIG = {
  scrollDistanceVh: 300,
  scrub: true,
  pin: true,
  overlayFadeStart: 0.8,
  overlayFadeEnd: 1,
} as const

export function getDeviceTier(width: number): DeviceTier {
  if (width < FRAME_CONFIG.breakpoints.mobile) return 'mobile'
  if (width < FRAME_CONFIG.breakpoints.tablet) return 'tablet'
  return 'desktop'
}

export function getFrameCount(width: number): number {
  return FRAME_CONFIG.counts[getDeviceTier(width)]
}

/**
 * Maps an effective frame count to evenly distributed source-file indices so the
 * full storyboard (0..totalSourceFrames-1) is covered on every device tier.
 */
export function getFrameIndices(effectiveCount: number): number[] {
  const total = FRAME_CONFIG.totalSourceFrames
  if (effectiveCount >= total) {
    return Array.from({ length: total }, (_, i) => i)
  }
  if (effectiveCount <= 1) return [0]

  const indices: number[] = []
  for (let i = 0; i < effectiveCount; i++) {
    const src = Math.round((i / (effectiveCount - 1)) * (total - 1))
    indices.push(src)
  }
  return indices
}

/** Builds the public URL for a 1-indexed source frame file (e.g. 0 -> /frames/0001.avif). */
export function getFrameUrl(sourceIndex: number): string {
  const fileNumber = sourceIndex + 1
  const padded = String(fileNumber).padStart(FRAME_CONFIG.padLength, '0')
  return `${FRAME_CONFIG.basePath}/${padded}.${FRAME_CONFIG.extension}`
}
