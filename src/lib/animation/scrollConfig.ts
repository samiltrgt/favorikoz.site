export type DeviceTier = 'mobile' | 'tablet' | 'desktop'

export const FRAME_CONFIG = {
  basePath: '/frames',
  extension: 'webp',
  filePrefix: 'frame_',
  fileSuffix: '_delay-0.042s',
  padLength: 3,
  posterSrc: '/frames/frame_000_delay-0.042s.webp',
  totalSourceFrames: 144,
  /** Frames loaded immediately after frame 0 (LCP-safe critical path). */
  preloadCount: 8,
  /** Remaining frames are decoded in idle batches of this size. */
  preloadBatchSize: 4,
  /** Delay before idle batch preload so LCP can paint first. */
  lcpDeferMs: 300,
  counts: {
    mobile: 36,
    tablet: 48,
    desktop: 72,
  },
  maxDpr: {
    mobile: 1,
    tablet: 1.5,
    desktop: 2,
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
  },
} as const

export const SCROLL_CONFIG = {
  scrollDistanceVh: 300,
  /** Slight smoothing — easier on slow scroll without hurting scrub fidelity much. */
  scrub: 0.5,
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

export function getMaxDpr(width: number): number {
  return FRAME_CONFIG.maxDpr[getDeviceTier(width)]
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

/** Builds the public URL for a 0-indexed source frame file (e.g. 0 -> /frames/frame_000_delay-0.042s.webp). */
export function getFrameUrl(sourceIndex: number): string {
  const index = Math.min(Math.max(sourceIndex, 0), FRAME_CONFIG.totalSourceFrames - 1)
  const padded = String(index).padStart(FRAME_CONFIG.padLength, '0')
  return `${FRAME_CONFIG.basePath}/${FRAME_CONFIG.filePrefix}${padded}${FRAME_CONFIG.fileSuffix}.${FRAME_CONFIG.extension}`
}
