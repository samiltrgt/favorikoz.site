import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from '@playwright/test'

const origin = process.argv[2] || 'http://localhost:3102'
const browser = await chromium.launch({ headless: true })
const evidence = []
try {
  for (const width of [390, 1440]) for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, javaScriptEnabled, isMobile: width < 640, hasTouch: width < 640 })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(origin, { waitUntil: 'load', timeout: 60000 })
    if (javaScriptEnabled) {
      const reject = page.getByRole('button', { name: 'Reddet', exact: true })
      await reject.waitFor({ timeout: 5000 }).then(() => reject.click()).catch(() => {})
    }
    await page.locator('.ep-row').first().scrollIntoViewIfNeeded()
    const layout = await page.evaluate(() => ({
      viewport: innerWidth, document: document.documentElement.scrollWidth,
      rows: [...document.querySelectorAll('.ep-row')].map(row => ({
        width: row.getBoundingClientRect().width,
        cards: [...row.querySelectorAll('.ep-slide')].map(card => card.getBoundingClientRect().width).filter(width => width > 0).slice(0, 4),
      })),
      images: [...document.images].filter(img => img.getBoundingClientRect().width > 0 && img.complete && img.naturalWidth > 0).slice(0, 12).map(img => ({ src: img.currentSrc, sizes: img.sizes, width: img.getBoundingClientRect().width })),
    }))
    assert.ok(layout.document <= width + 1, 'horizontal page overflow')
    assert.ok(layout.rows.length > 0 && layout.rows.every(row => row.cards.length > 0 && row.cards.every(size => size > 100 && size < row.width)), 'editorial card dimensions')
    if (javaScriptEnabled) {
      const next = page.locator('.ep-row').first().getByRole('button', { name: /sonraki ürünler/ })
      const track = page.locator(width < 640 ? '.ep-pane--mobile .ep-track' : '.ep-pane--desktop .ep-track').first()
      const before = await track.evaluate(el => getComputedStyle(el).transform)
      await next.click()
      await page.waitForFunction(({ selector, before }) => getComputedStyle(document.querySelector(selector)).transform !== before, { selector: width < 640 ? '.ep-pane--mobile .ep-track' : '.ep-pane--desktop .ep-track', before })
      await page.locator('.pc-rail').scrollIntoViewIfNeeded()
      const rail = page.locator('.pc-rail')
      const scrollBefore = await rail.evaluate(el => el.scrollLeft)
      await page.getByRole('button', { name: 'Sonraki ürünler', exact: true }).click()
      await page.waitForFunction(before => document.querySelector('.pc-rail').scrollLeft > before, scrollBefore)
      await page.getByRole('button', { name: 'Sonraki banner', exact: true }).scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: 'Banner 1', exact: true }).click()
      await page.getByRole('button', { name: 'Sonraki banner', exact: true }).click()
      assert.equal(await page.getByRole('button', { name: 'Banner 2', exact: true }).getAttribute('aria-current'), 'true')
    }
    assert.deepEqual(errors, [])
    await page.locator('.ep-row').first().scrollIntoViewIfNeeded()
    await page.waitForFunction(() => [...document.images].filter(img => {
      const rect = img.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0 && rect.left < innerWidth && rect.right > 0
    }).every(img => img.complete && img.naturalWidth > 0), undefined, { timeout: 15000 })
    await page.screenshot({ path: `docs/perf-final-${width}-${javaScriptEnabled ? 'js' : 'nojs'}.png` })
    evidence.push({ width, javaScriptEnabled, ...layout, errors, interactions: javaScriptEnabled ? 'editorial, promo, banner passed' : 'SSR visibility passed' })
    await context.close()
  }
  const baseline = JSON.parse(await fs.readFile('docs/seo-baseline.json', 'utf8'))
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.goto(`${origin}/urun/${baseline.candidateProducts[0].slug}`, { waitUntil: 'load' })
  const image = page.getByRole('img', { name: baseline.candidateProducts[0].name, exact: true }).first()
  await image.waitFor()
  const productImage = await image.evaluate(el => ({ src: el.currentSrc, width: el.getBoundingClientRect().width, loaded: el.complete && el.naturalWidth > 0, srcset: el.srcset }))
  assert.ok(productImage.loaded)
  assert.ok(productImage.src.includes('/seo-images/'))
  const response = await fetch(productImage.src)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control'), /max-age=31536000.*immutable/)
  evidence.push({ productImage, cacheControl: response.headers.get('cache-control') })
  const nextImage = page.getByRole('button', { name: 'Sonraki görsel', exact: true })
  if (await nextImage.count()) {
    await nextImage.click()
    await page.waitForFunction(before => [...document.images].some(img => img.fetchPriority === 'high' && img.currentSrc !== before && img.complete && img.naturalWidth > 0), productImage.src)
  }
  await context.close()
  const lowDpr = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const lowPage = await lowDpr.newPage()
  await lowPage.goto(origin, { waitUntil: 'load' })
  const selected = await lowPage.locator('.pc-product img').first().evaluate(img => ({ src: img.currentSrc, width: img.getBoundingClientRect().width }))
  assert.match(selected.src, /-320\.webp$/)
  evidence.push({ deviceScaleFactor: 1, selected })
  await lowDpr.close()
} finally {
  await browser.close()
  await fs.writeFile('docs/perf-browser-acceptance.json', JSON.stringify({ origin, checkedAt: new Date().toISOString(), evidence }, null, 2))
}
console.log(`PASS ${evidence.length} browser scenarios`)
