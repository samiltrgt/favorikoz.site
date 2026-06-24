import { BaseCanvasRenderer, FrameDraw } from './types'

type DecodedSheet = ImageBitmap | HTMLImageElement

export interface SpriteSheetOptions {
  /** One or more sprite-sheet image URLs, consumed in order. */
  sheets: string[]
  columns: number
  rows: number
  frameWidth: number
  frameHeight: number
  /** Total number of usable frames across all sheets. */
  frameCount: number
}

export class SpriteSheetRenderer extends BaseCanvasRenderer {
  private readonly options: SpriteSheetOptions
  private readonly framesPerSheet: number
  private readonly supportsBitmap: boolean
  private sheets: (DecodedSheet | null)[]

  constructor(canvas: HTMLCanvasElement, options: SpriteSheetOptions) {
    super(canvas)
    this.options = options
    this.framesPerSheet = Math.max(1, options.columns * options.rows)
    this.sheets = new Array(options.sheets.length).fill(null)
    this.supportsBitmap = typeof createImageBitmap === 'function'
  }

  get frameCount(): number {
    return this.options.frameCount
  }

  isFrameReady(index: number): boolean {
    const sheetIndex = Math.floor(index / this.framesPerSheet)
    return !!this.sheets[sheetIndex]
  }

  /** Interface entry point. Loads the first sheet (LCP swap), then the rest in parallel. */
  async load(onFirstFrameReady?: () => void): Promise<void> {
    if (this.disposed || this.options.sheets.length === 0) return

    await this.loadSheet(0)
    if (this.disposed) return
    onFirstFrameReady?.()

    const rest: Promise<void>[] = []
    for (let i = 1; i < this.options.sheets.length; i++) {
      rest.push(this.loadSheet(i))
    }
    await Promise.all(rest)
  }

  /** Explicit alias matching the sprite-sheet source API. */
  loadSpriteSheet(onFirstFrameReady?: () => void): Promise<void> {
    return this.load(onFirstFrameReady)
  }

  dispose(): void {
    this.disposed = true
    for (let i = 0; i < this.sheets.length; i++) {
      this.closeSheet(this.sheets[i])
      this.sheets[i] = null
    }
    this.sheets = []
  }

  protected getFrameSource(index: number): FrameDraw | null {
    const clamped = Math.min(Math.max(index, 0), this.options.frameCount - 1)
    const sheetIndex = Math.floor(clamped / this.framesPerSheet)
    const sheet = this.sheets[sheetIndex] ?? this.findNearestReadySheet(sheetIndex)
    if (!sheet) return null

    const local = clamped % this.framesPerSheet
    const column = local % this.options.columns
    const row = Math.floor(local / this.options.columns)

    return {
      source: sheet,
      sx: column * this.options.frameWidth,
      sy: row * this.options.frameHeight,
      sw: this.options.frameWidth,
      sh: this.options.frameHeight,
    }
  }

  private findNearestReadySheet(index: number): DecodedSheet | null {
    for (let distance = 1; distance < this.sheets.length; distance++) {
      const lower = index - distance
      const upper = index + distance
      if (lower >= 0 && this.sheets[lower]) return this.sheets[lower]
      if (upper < this.sheets.length && this.sheets[upper]) return this.sheets[upper]
    }
    return null
  }

  private async loadSheet(index: number): Promise<void> {
    if (this.disposed || this.sheets[index]) return
    try {
      const sheet = await this.decode(this.options.sheets[index])
      if (this.disposed) {
        this.closeSheet(sheet)
        return
      }
      this.sheets[index] = sheet
    } catch {
      // Leave slot null; getFrameSource falls back to the nearest decoded sheet.
    }
  }

  private async decode(url: string): Promise<DecodedSheet> {
    if (this.supportsBitmap) {
      const response = await fetch(url, { cache: 'force-cache' })
      if (!response.ok) {
        throw new Error(`Failed to fetch sprite sheet: ${url} (${response.status})`)
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
      img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${url}`))
      img.src = url
    })
  }

  private closeSheet(sheet: DecodedSheet | null): void {
    if (sheet && typeof (sheet as ImageBitmap).close === 'function') {
      ;(sheet as ImageBitmap).close()
    }
  }
}
