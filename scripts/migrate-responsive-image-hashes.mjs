import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

// One-time local migration. No source downloads or database requests.
const file = 'src/data/optimized-images.json'
const manifest = JSON.parse(await fs.readFile(file, 'utf8'))
const groups = new Map()
for (const [source, entry] of Object.entries(manifest)) {
  if (groups.has(entry.hash)) continue
  const buffers = await Promise.all(entry.widths.map(width => fs.readFile(`public/seo-images/${entry.hash}-${width}.webp`)))
  const digest = createHash('sha256').update(source)
  for (const buffer of buffers) digest.update(buffer)
  const hash = digest.digest('hex').slice(0, 20)
  await Promise.all(buffers.map((buffer, index) => fs.writeFile(`public/seo-images/${hash}-${entry.widths[index]}.webp`, buffer)))
  groups.set(entry.hash, { hash, widths: entry.widths })
}
for (const [source, entry] of Object.entries(manifest)) manifest[source] = groups.get(entry.hash)
await fs.writeFile(file, JSON.stringify(manifest))
const root = path.resolve('public/seo-images')
const referenced = new Set(Object.values(manifest).flatMap(entry => entry.widths.map(width => `${entry.hash}-${width}.webp`)))
const tracked = new Set(execFileSync('git', ['ls-files', 'public/seo-images'], { encoding: 'utf8' }).trim().split(/\r?\n/).map(file => path.basename(file)))
let removed = 0
for (const name of await fs.readdir(root)) {
  if (!/^[a-f0-9]{20}-\d+\.webp$/.test(name) || referenced.has(name) || tracked.has(name)) continue
  const target = path.resolve(root, name)
  if (path.dirname(target) !== root) throw new Error('Cleanup path outside generated image directory')
  await fs.unlink(target)
  removed++
}
console.log(JSON.stringify({ groups: groups.size, entries: Object.keys(manifest).length, referencedFiles: referenced.size, removedUntrackedUnreferencedFiles: removed, preservedTrackedFiles: tracked.size }))
