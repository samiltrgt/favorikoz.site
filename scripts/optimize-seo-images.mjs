import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

// Build-time derivatives preserve source content and avoid an image API subscription.
// Run after updating the measured/catalog selection. Optional argv[2]: sharp module path.
const require = createRequire(import.meta.url)
const sharp = require(process.argv[2] || 'sharp')
const baseline = JSON.parse(await fs.readFile('docs/seo-baseline.json', 'utf8'))
const metrics = JSON.parse(await fs.readFile('docs/seo-performance-before.json', 'utf8'))
const candidates = new Set(baseline.candidateProducts.flatMap(p => [p.image, ...(p.images || [])]).filter(Boolean))
for (const result of metrics.results) {
  for (const image of result.images || []) {
    if (/\/products\/|\/home-banners\//.test(image.url)) candidates.add(image.url)
  }
}
for (let i = 1; i <= 4; i++) candidates.add(`/home-banners/banner${i}.jpg`)
let existing = {}
try { existing = JSON.parse(await fs.readFile('src/data/optimized-images.json', 'utf8')) } catch {}
const report = []
await fs.mkdir('public/seo-images', { recursive: true })
for (const source of candidates) {
  if (source.includes('res.cloudinary.com')) continue
  try {
    let original
    if (source.startsWith('/')) original = await fs.readFile(path.join('public', source))
    else {
      const response = await fetch(source, { signal: AbortSignal.timeout(30000) })
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image fetch status ${response.status}`)
      original = Buffer.from(await response.arrayBuffer())
    }
    if (original.length > 20000000) throw new Error('Image exceeds build input limit')
    const meta = await sharp(original).metadata()
    const widths = source.includes('/home-banners/') ? [420, 828, 1440, 2188] : [320, 640, 1080]
    const hash = createHash('sha256').update(source).digest('hex').slice(0, 20)
    const variants = []
    for (const width of widths) {
      const destination = `/seo-images/${hash}-${width}.webp`
      const buffer = await sharp(original).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toBuffer()
      await fs.writeFile(path.join('public', destination), buffer)
      variants.push({ width, path: destination })
      report.push({ source, width, originalBytes: original.length, optimizedBytes: buffer.length, originalWidth: meta.width })
    }
    existing[source] = variants
    if (source.includes('/home-banners/')) {
      const pathname = source.startsWith('/') ? source : new URL(source).pathname
      existing[pathname] = variants
      for (const host of ['https://www.favorikozmetik.com', 'https://favorikozmetik.com']) existing[host + pathname] = variants
    }
    console.log(JSON.stringify({ source, originalBytes: original.length, mobileBytes: report.at(-widths.length).optimizedBytes }))
  } catch (error) { report.push({ source, error: error.message }); console.log(JSON.stringify({ source, error: error.message })) }
}
await fs.writeFile('src/data/optimized-images.json', JSON.stringify(existing, null, 2))
await fs.writeFile('docs/seo-image-optimization.json', JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2))
