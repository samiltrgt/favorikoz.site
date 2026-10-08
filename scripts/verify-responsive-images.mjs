import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { gzipSync } from 'node:zlib'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const sharp = require(process.argv[2] || 'sharp')
const raw = await fs.readFile('src/data/optimized-images.json')
const manifest = JSON.parse(raw)
const groups = new Set()
let files = 0, bytes = 0, smallerThan320 = 0
for (const [source, entry] of Object.entries(manifest)) {
  if (groups.has(entry.hash)) continue
  groups.add(entry.hash)
  const digest = createHash('sha256').update(source)
  for (const width of entry.widths) {
    const buffer = await fs.readFile(`public/seo-images/${entry.hash}-${width}.webp`)
    const metadata = await sharp(buffer).metadata()
    assert.equal(metadata.width, width, `Incorrect srcset width for ${source}`)
    assert.equal(metadata.format, 'webp')
    digest.update(buffer)
    files++
    bytes += buffer.length
    if (width < 320) smallerThan320++
  }
  assert.equal(digest.digest('hex').slice(0, 20), entry.hash, `Content hash mismatch for ${source}`)
}
const evidence = { verifiedAt: new Date().toISOString(), entries: Object.keys(manifest).length, uniqueSourceGroups: groups.size, verifiedFiles: files, derivativeBytes: bytes, actualWidthBelow320: smallerThan320, manifestBytes: raw.length, manifestGzipBytes: gzipSync(raw).length, passed: true }
await fs.writeFile('docs/perf-images-verification.json', JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence))
