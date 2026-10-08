import fs from 'node:fs/promises'
import path from 'node:path'

/** An interrupted/failed refresh must never replace the last deployable manifest. */
export async function writeImageManifestCheckpoint({ manifest, progressPath, manifestPath, complete, failures }) {
  await fs.mkdir(path.dirname(progressPath), { recursive: true })
  await fs.writeFile(progressPath, JSON.stringify({ manifest }))
  if (!complete || failures !== 0) return false
  await fs.writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest))
  await fs.rename(`${manifestPath}.tmp`, manifestPath)
  return true
}
