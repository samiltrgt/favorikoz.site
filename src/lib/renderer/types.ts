export interface CanvasMetrics {
  cssWidth: number
  cssHeight: number
  dpr: number
}

export interface FrameDraw {
  source: CanvasImageSource
  sx: number
  sy: number
  sw: number
  sh: number
}

/**
 * Common renderer contract. `HeroSection`/`useSpriteScroll` depend only on this
 * interface, so frame-sequence and sprite-sheet sources are interchangeable.
 */
export interface ISequenceRenderer {
  readonly frameCount: number
  load(onFirstFrameReady?: () => void): Promise<void>
  drawFrame(index: number): void
  resize(metrics: CanvasMetrics): void
  isFrameReady(index: number): boolean
  dispose(): void
}

export abstract class BaseCanvasRenderer implements ISequenceRenderer {
  protected readonly ctx: CanvasRenderingContext2D
  protected metrics: CanvasMetrics = { cssWidth: 0, cssHeight: 0, dpr: 1 }
  protected currentIndex = -1
  protected disposed = false

  constructor(protected readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable')
    }
    this.ctx = ctx
  }

  abstract get frameCount(): number
  abstract load(onFirstFrameReady?: () => void): Promise<void>
  abstract isFrameReady(index: number): boolean
  abstract dispose(): void

  protected abstract getFrameSource(index: number): FrameDraw | null

  resize(metrics: CanvasMetrics): void {
    if (this.disposed) return
    this.metrics = metrics
    const { cssWidth, cssHeight, dpr } = metrics
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr))
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr))
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (this.currentIndex >= 0) {
      this.paint(this.currentIndex)
    }
  }

  drawFrame(index: number): void {
    if (this.disposed) return
    this.paint(index)
    this.currentIndex = index
  }

  protected paint(index: number): void {
    const frame = this.getFrameSource(index)
    if (!frame) return

    const { source, sx, sy, sw, sh } = frame
    if (!sw || !sh) return

    const { cssWidth, cssHeight } = this.metrics
    if (!cssWidth || !cssHeight) return

    // object-fit: cover — scale to fill while preserving aspect ratio, center the overflow.
    const scale = Math.max(cssWidth / sw, cssHeight / sh)
    const dw = sw * scale
    const dh = sh * scale
    const dx = (cssWidth - dw) / 2
    const dy = (cssHeight - dh) / 2

    this.ctx.clearRect(0, 0, cssWidth, cssHeight)
    this.ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)
  }
}
