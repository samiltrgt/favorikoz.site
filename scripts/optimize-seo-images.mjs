import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { writeImageManifestCheckpoint } from './lib/image-manifest.mjs'

// Manual catalog maintenance, not a network-dependent deploy/build step.
// node scripts/optimize-seo-images.mjs [sharp module path] [--refresh]
// Reruns reuse completed assets; --refresh handles source content replaced at the same URL.
dotenv.config({ path: '.env.local', quiet: true })
const require = createRequire(import.meta.url)
const sharp = require(process.argv[2]?.startsWith('--') ? 'sharp' : process.argv[2] || 'sharp')
sharp.concurrency(1)
const refresh = process.argv.includes('--refresh')
const manifestPath = 'src/data/optimized-images.json'
const reportPath = 'docs/seo-image-optimization.json'
const progressPath = '.cache/seo-images-progress.json'
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const rows = []
while (true) {
  const { data, count, error } = await client.from('products').select('id,image,images', { count: 'exact' }).is('deleted_at', null).order('id').range(rows.length, rows.length + 499)
  if (error || !data || count === null) throw new Error('Public catalog read failed; refusing an incomplete manifest')
  rows.push(...data)
  if (rows.length >= count) break
  if (!data.length) throw new Error('Public catalog pagination incomplete')
}
const candidates = new Set(rows.flatMap(p => [p.image, ...(Array.isArray(p.images) ? p.images : [])]).filter(value => typeof value === 'string' && value.trim()))
for (let i = 1; i <= 4; i++) candidates.add(`/home-banners/banner${i}.jpg`)
for (const name of await fs.readdir('public/brands')) if (/\.png$/.test(name)) candidates.add(`/brands/${name}`)
let existing = {}, previous = {}
try { existing = JSON.parse(await fs.readFile(manifestPath, 'utf8')) } catch {}
if (!refresh) {
  try { existing = { ...existing, ...JSON.parse(await fs.readFile(progressPath, 'utf8')).manifest } } catch {}
}
try { previous = JSON.parse(await fs.readFile(reportPath, 'utf8')) } catch {}
const evidence = new Map((previous.report || []).filter(row => row.source && row.width === undefined).map(row => [row.source, row]))
const manifest = {}
await fs.mkdir('public/seo-images', { recursive: true })
let completed = 0, failures = 0
async function checkpoint(publish = false) {
  await writeImageManifestCheckpoint({ manifest, progressPath, manifestPath, complete: publish, failures })
  await fs.writeFile(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), catalogProducts: rows.length, candidateSources: candidates.size, completedSources: completed, failedSources: failures, report: [...evidence.values()] }, null, 2))
}
async function processSource(source) {
  const requested = source.startsWith('/home-banners/') ? [420, 828, 1440, 2188] : source.startsWith('/brands/') ? [240] : [320, 640, 960]
  try {
    const old = existing[source]
    const oldWidths = old?.widths
    if (!refresh && /^[a-f0-9]{20}$/.test(old?.hash || '') && Array.isArray(oldWidths) && oldWidths.length) {
      const stats = await Promise.all(oldWidths.map(width => fs.stat(`public/seo-images/${old.hash}-${width}.webp`))).catch(() => null)
      if (stats?.every(stat => stat.size > 0)) {
        manifest[source] = old
        const cachedEvidence = evidence.get(source)
        if (cachedEvidence?.error) {
          const { error, ...cleanEvidence } = cachedEvidence
          evidence.set(source, { ...cleanEvidence, reused: true })
        }
        completed++
        return
      }
    }
    let original
    if (source.startsWith('/')) {
      const resolved = path.resolve('public', `.${source}`)
      if (!resolved.startsWith(path.resolve('public') + path.sep)) throw new Error('Local source outside public')
      original = await fs.readFile(resolved)
    } else {
      const url = new URL(source)
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported image protocol')
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image fetch status ${response.status}`)
      original = Buffer.from(await response.arrayBuffer())
    }
    if (original.length > 20000000) throw new Error('Image exceeds build input limit')
    const meta = await sharp(original).metadata()
    if ((meta.pages || 1) > 1) throw new Error('Animated image retained as original')
    const sourceWidth = [5, 6, 7, 8].includes(meta.orientation) ? meta.height : meta.width
    if (!sourceWidth) throw new Error('Image dimensions unavailable')
    const widths = [...new Set(requested.map(width => Math.min(width, sourceWidth)))].sort((a, b) => a - b)
    const variants = []
    const encoded = []
    for (const width of widths) {
      const buffer = await sharp(original).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80, effort: 3 }).toBuffer()
      encoded.push(buffer)
      variants.push({ width, bytes: buffer.length })
    }
    // URLs change when encoded content changes, allowing immutable CDN/browser caching.
    const digest = createHash('sha256').update(source)
    for (const buffer of encoded) digest.update(buffer)
    const hash = digest.digest('hex').slice(0, 20)
    await Promise.all(encoded.map((buffer, index) => fs.writeFile(`public/seo-images/${hash}-${widths[index]}.webp`, buffer)))
    manifest[source] = { hash, widths }
    evidence.set(source, { source, originalBytes: original.length, originalWidth: sourceWidth, variants })
    completed++
  } catch (error) {
    failures++
    evidence.set(source, { ...evidence.get(source), source, error: error.message })
    console.log(JSON.stringify({ failedSource: source, error: error.message }))
  }
}
const sources = [...candidates]
for (let offset = 0; offset < sources.length; offset += 6) {
  await Promise.all(sources.slice(offset, offset + 6).map(processSource))
  if (offset % 60 === 0 || offset + 6 >= sources.length) {
    await checkpoint()
    console.log(JSON.stringify({ completed, failures, total: sources.length }))
  }
}
for (const [source, value] of Object.entries(manifest)) {
  if (source.startsWith('/home-banners/')) for (const host of ['https://www.favorikozmetik.com', 'https://favorikozmetik.com']) manifest[host + source] = value
}
// Failed runs retain the last complete published manifest; progress remains resumable.
await checkpoint(failures === 0)
console.log(JSON.stringify({ completed, failures, total: sources.length, manifestBytes: Buffer.byteLength(JSON.stringify(manifest)) }))
if (failures) process.exitCode = 2
