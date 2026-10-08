export function responsiveImage(src: string) {
  const match = src.match(/^\/seo-images\/([a-f0-9]{20})-(\d+)\.webp\?widths=([\d,]+)$/)
  if (!match) return null
  const widths = match[3].split(',').map(Number)
  if (widths.length > 8 || widths.some((width, index) => !Number.isInteger(width) || width <= 0 || width > 6000 || (index > 0 && width <= widths[index - 1])) || widths[widths.length - 1] !== Number(match[2])) return null
  const url = (width: number) => `/seo-images/${match[1]}-${width}.webp`
  return {
    src: url(widths[widths.length - 1]),
    // Descriptors are the actual encoded widths, including smaller source images.
    srcSet: widths.map(width => `${url(width)} ${width}w`).join(', '),
  }
}
