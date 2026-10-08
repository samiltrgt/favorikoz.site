# Responsive catalog images — completed

Owner: perf_images. Public catalog read only; no database writes, no deployment, no commits.

## Scope and evidence

- 1,181 undeleted products; 2,428 distinct main/gallery image URLs.
- Plus four home banners and four transparent brand logos: **2,436 processed sources, zero failed sources**.
- 2,444 manifest entries include eight aliases for local home banners through the two production origins.
- 7,266 referenced WebP files, bounded widths 320/640/960 for catalog images and 420/828/1440/2188 for banners. Smaller originals retain their actual width and are never enlarged; brand logos are at most 240px wide. Quality 80, no crop or content changes.
- Original source bytes across this snapshot: 414,517,093; smallest derivative per source: 26,639,444 bytes. This is a catalog-wide byte comparison, **not** the bytes loaded by a single page or a predicted Lighthouse score.
- All derivative variants total **210,828,784 bytes (201 MiB)**. The generated directory additionally preserves 172 historical tracked assets: 216,350,750 bytes across 7,438 files. This increases repository/deploy storage; each browser downloads only its selected variants, not this whole directory.
- Brand PNGs: 41,872 bytes combined → 19,280 bytes WebP. Transparency preserved.
- Manifest: 403,880 raw bytes, about 88.8KB gzip. **Server-only**, excluded from browser JS after root review caught a material client-bundle regression in the first implementation. Final build/bundle measurements belong to root verification.

## Delivery architecture

`responsive-image-server.ts` imports the catalog manifest with a `server-only` boundary. Product detail, category/catalog and home data loaders resolve only the images sent to that page to a small reference such as `/seo-images/<contenthash>-960.webp?widths=320,640,960`.

The client parser validates bounded sorted width references and builds clean local `src`/`srcset` URLs. The image component emits actual encoded-width descriptors directly; Next's global configured widths cannot falsely describe these files. Fill sizing, load callbacks, eager/high priority for explicitly prioritized images and lazy defaults are preserved. Unknown/new images retain their original URL; Cloudinary remains capable of its native transformations. A new product image needs the maintenance command before responsive derivatives are available, but the product is still visible immediately through its original URL.

Content-addressed hashes include source URL plus ordered encoded bytes. A changed output gets a new URL, allowing long immutable caching. The local migration reused completed files and downloaded nothing; superseded untracked generated files were removed only after resolved-path checks, while all historical tracked files were preserved.

## Maintenance and interruption safety

Run `node scripts/optimize-seo-images.mjs [sharp-module-path]` manually when catalog images change. This reads all undeleted public catalog rows with exact counts and received-row pagination, without service-role access. It is deliberately **not** part of deployment/build: deploys must not depend on thousands of third-party downloads.

Completed derivatives are reused; a full rerun of the current catalog completed in 1.7 seconds without origin downloads. Six-source batches bound CPU/memory. Progress is saved to ignored `.cache/seo-images-progress.json`; **only a completed run with zero failures atomically replaces the deployable manifest**. On failure, the previous complete manifest remains intact, the report lists each source/error and the command exits 2. Fix unavailable sources or retry; do not publish a partial checkpoint. `--refresh` explicitly re-downloads sources whose content changed at the same URL. New/failed unknown sources use the original-image fallback until a successful refresh publishes their derivative.

Optional sharp module path used in this workspace:

`C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs`

## Validation

- `scripts/verify-responsive-images.mjs [sharp-module-path]`: all 7,266 files decoded; every actual width equals its srcset descriptor, every format is WebP, every content hash matches. Passed; evidence `docs/perf-images-verification.json`.
- Focused Jest: 37 tests across image manifest/parser, native responsive component, product card, product lookup and category pagination passed.
- TypeScript `npx tsc --noEmit` passed.
- `node --test scripts/lib/image-manifest.test.mjs` passed: interrupted/failed refresh preserves the last published manifest, retains progress, and a successful complete refresh replaces it.
- Root owns production build, before/after performance measurements, browser/commerce checks and final review. No live performance improvement is claimed from these byte counts alone.
