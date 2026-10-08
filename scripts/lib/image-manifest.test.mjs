import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { writeImageManifestCheckpoint } from './image-manifest.mjs'

test('failed or interrupted image refresh preserves the last deployable manifest and saves progress', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'image-manifest-'))
  try {
    const manifestPath = path.join(directory, 'published.json')
    const progressPath = path.join(directory, 'cache', 'progress.json')
    const published = { previous: { hash: 'old', widths: [320] } }
    const partial = { next: { hash: 'new', widths: [320] } }
    await fs.writeFile(manifestPath, JSON.stringify(published))
    for (const state of [{ complete: false, failures: 0 }, { complete: true, failures: 1 }]) {
      assert.equal(await writeImageManifestCheckpoint({ manifest: partial, manifestPath, progressPath, ...state }), false)
      assert.deepEqual(JSON.parse(await fs.readFile(manifestPath)), published)
      assert.deepEqual(JSON.parse(await fs.readFile(progressPath)), { manifest: partial })
    }
    assert.equal(await writeImageManifestCheckpoint({ manifest: partial, manifestPath, progressPath, complete: true, failures: 0 }), true)
    assert.deepEqual(JSON.parse(await fs.readFile(manifestPath)), partial)
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})
