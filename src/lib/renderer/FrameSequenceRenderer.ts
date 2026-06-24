import { BaseCanvasRenderer, FrameDraw } from './types'

type DecodedFrame = ImageBitmap | HTMLImageElement

export interface FrameSequenceOptions {
  frameUrls: string[]
  preloadCount: number
  preloadBatchSize: number
  lcpDeferMs: number
}

function sourceSize(source: DecodedFrame): { sw: number; sh: number } {
  if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
    return { sw: source.naturalWidth, sh: source.naturalHeight }
  }
  const bitmap = source as ImageBitmap
  return { sw: bitmap.width, sh: bitmap.height }
}

export class FrameSequenceRenderer extends BaseCanvasRenderer {
  private urls: string[]
  private frames: (DecodedFrame | null)[]
  private readonly preloadCount: number
  private readonly preloadBatchSize: number
  private readonly lcpDeferMs: number
  private readonly supportsBitmap: boolean
  private nextToLoad = 0
  private deferApplied = false
  private idleHandle: number | null = null
  private idleTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(canvas: HTMLCanvasElement, options: FrameSequenceOptions) {
    super(canvas)
    this.urls = options.frameUrls.slice()
    this.frames = new Array(this.urls.length).fill(null)
    this.preloadCount = Math.min(Math.max(options.preloadCount, 1), this.urls.length)
    this.preloadBatchSize = Math.max(1, options.preloadBatchSize)
    this.lcpDeferMs = Math.max(0, options.lcpDeferMs)
    this.supportsBitmap = typeof createImageBitmap === 'function'
  }

  get frameCount(): number {
    return this.urls.length
  }

  isFrameReady(index: number): boolean {
    return !!this.frames[index]
  }

  /** Loads frame 0 (LCP swap), a small critical window, then the rest in idle batches. */
  async load(onFirstFrameReady?: () => void): Promise<void> {
    if (this.disposed || this.urls.length === 0) return

    await this.loadIndex(0)
    if (this.disposed) return
    onFirstFrameReady?.()

    const criticalEnd = Math.min(this.preloadCount, this.urls.length)
    if (criticalEnd > 1) {
      const criticalLoads: Promise<void>[] = []
      for (let i = 1; i < criticalEnd; i++) {
        criticalLoads.push(this.loadIndex(i))
      }
      await Promise.all(criticalLoads)
    }
    if (this.disposed) return

    this.nextToLoad = criticalEnd
    this.scheduleRemainingBatches()
  }

  /** Explicit alias matching the frame-sequence source API. */
  loadFrameSequence(onFirstFrameReady?: () => void): Promise<void> {
    return this.load(onFirstFrameReady)
  }

  dispose(): void {
    this.disposed = true
    if (this.idleHandle !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
      ;(window as Window & { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(this.idleHandle)
    }
    if (this.idleTimeout !== null) {
      clearTimeout(this.idleTimeout)
    }
    this.idleHandle = null
    this.idleTimeout = null

    for (let i = 0; i < this.frames.length; i++) {
      this.closeFrame(this.frames[i])
      this.frames[i] = null
    }
    this.frames = []
    this.urls = []
  }

  protected getFrameSource(index: number): FrameDraw | null {
    if (this.frames.length === 0) return null
    const clamped = Math.min(Math.max(index, 0), this.frames.length - 1)

    let source = this.frames[clamped]
    if (!source) {
      source = this.findNearestReady(clamped)
    }
    if (!source) return null

    const { sw, sh } = sourceSize(source)
    return { source, sx: 0, sy: 0, sw, sh }
  }

  private findNearestReady(index: number): DecodedFrame | null {
    for (let distance = 1; distance < this.frames.length; distance++) {
      const lower = index - distance
      const upper = index + distance
      if (lower >= 0 && this.frames[lower]) return this.frames[lower]
      if (upper < this.frames.length && this.frames[upper]) return this.frames[upper]
    }
    return null
  }

  private async loadIndex(index: number): Promise<void> {
    if (this.disposed || this.frames[index]) return
    try {
      const frame = await this.decode(this.urls[index])
      if (this.disposed) {
        this.closeFrame(frame)
        return
      }
      this.frames[index] = frame
    } catch {
      // Leave slot null; getFrameSource holds the nearest decoded frame instead of blanking.
    }
  }

  private async decode(url: string): Promise<DecodedFrame> {
    if (this.supportsBitmap) {
      const response = await fetch(url, { cache: 'force-cache' })
      if (!response.ok) {
        throw new Error(`Failed to fetch frame: ${url} (${response.status})`)
      }
      const blob = await response.blob()
      return await createImageBitmap(blob)
    }
    return this.decodeViaImage(url)
  }

  private decodeViaImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load frame: ${url}`))
      img.src = url
    })
  }

  private scheduleRemainingBatches(): void {
    if (this.disposed || this.nextToLoad >= this.urls.length) return

    const runBatch = (): void => {
      this.idleHandle = null
      this.idleTimeout = null
      if (this.disposed || this.nextToLoad >= this.urls.length) return

      const batchEnd = Math.min(this.nextToLoad + this.preloadBatchSize, this.urls.length)
      const batch: Promise<void>[] = []
      for (let i = this.nextToLoad; i < batchEnd; i++) {
        batch.push(this.loadIndex(i))
      }
      this.nextToLoad = batchEnd

      void Promise.all(batch).then(() => {
        if (!this.disposed) this.scheduleRemainingBatches()
      })
    }

    const scheduleIdle = (): void => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        this.idleHandle = (
          window as Window & {
            requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number
          }
        ).requestIdleCallback(runBatch, { timeout: 3000 })
      } else {
        this.idleTimeout = setTimeout(runBatch, 48)
      }
    }

    if (!this.deferApplied && this.lcpDeferMs > 0) {
      this.deferApplied = true
      this.idleTimeout = setTimeout(() => {
        this.idleTimeout = null
        scheduleIdle()
      }, this.lcpDeferMs)
    } else {
      scheduleIdle()
    }
  }

  private closeFrame(frame: DecodedFrame | null): void {
    if (frame && typeof (frame as ImageBitmap).close === 'function') {
      ;(frame as ImageBitmap).close()
    }
  }
}
