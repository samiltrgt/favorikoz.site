import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { chromium } from '@playwright/test'

dotenv.config({ path: '.env.local', quiet: true })
const origin = process.argv[2] || 'http://localhost:3100'
const output = process.argv[3] || 'docs/seo-acceptance.json'
const production = 'https://www.favorikozmetik.com'
const baseline = JSON.parse(await fs.readFile('docs/seo-baseline.json', 'utf8'))
const outcomes = []
async function check(label, run) {
  try { const evidence = await run(); outcomes.push({ label, passed: true, evidence }); console.log(`PASS ${label}`) }
  catch (error) { outcomes.push({ label, passed: false, error: error.message }); console.log(`FAIL ${label}: ${error.message}`) }
}
function schemas(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match => {
    const value = JSON.parse(match[1]); return Array.isArray(value) ? value : value['@graph'] || [value]
  })
}
function canonical(html) { return html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&') }
function robots(html) { return [...html.matchAll(/<meta[^>]*name="(robots|googlebot)"[^>]*content="([^"]+)"/g)].map(match => ({ name: match[1], value: match[2] })) }
async function get(path) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(45000) })
  return { status: response.status, headers: Object.fromEntries(response.headers), html: await response.text() }
}
async function publicRows(table, fields) {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const rows = []
  while (true) {
    const { data, count, error } = await client.from(table).select(fields, { count: 'exact' }).is('deleted_at', null).order('id').range(rows.length, rows.length + 499)
    if (error || !data || count === null) throw new Error(`${table} verification query failed`)
    rows.push(...data)
    if (rows.length >= count) return rows
    if (!data.length) throw new Error(`${table} verification query incomplete`)
  }
}
const guidePaths = ['/kategori/tirnak', '/kategori/tirnak/protez-tirnak-malzemeleri/kalici-oje', '/kategori/ipek-kirpik', '/kategori/kuafor-malzemeleri', '/kategori/sac-bakimi']
// Resolve guide path from current category ancestry, rather than a hard-coded depth.
const categoryMap = new Map(baseline.categories.map(row => [row.slug, row]))
function categoryPath(slug) {
  const path = [], seen = new Set()
  for (let row = categoryMap.get(slug); row && !seen.has(row.slug); row = categoryMap.get(row.parent_slug)) { path.unshift(row.slug); seen.add(row.slug) }
  return `/kategori/${path.join('/')}`
}
guidePaths[1] = categoryPath('kalici-oje')
for (const path of ['/', '/tum-urunler', '/tum-urunler?page=2', ...guidePaths, categoryPath('toz-toplayici')]) {
  await check(`public ${path}`, async () => {
    const page = await get(path)
    assert.equal(page.status, 200)
    assert.equal(new URL(canonical(page.html)).href, new URL(path, production).href)
    assert.ok(!robots(page.html).some(rule => /noindex/.test(rule.value)))
    assert.ok(/<h1[ >]/.test(page.html)); assert.ok(/<title>[^<]+<\/title>/.test(page.html))
    if (guidePaths.includes(path)) assert.ok(page.html.includes('id="category-guide"'), 'visible guide absent')
    const parsed = schemas(page.html)
    return { status: page.status, canonical: canonical(page.html), robots: robots(page.html), schemaTypes: parsed.map(value => value['@type']), htmlBytes: Buffer.byteLength(page.html) }
  })
}
for (const product of baseline.candidateProducts) {
  await check(`product ${product.slug}`, async () => {
    const page = await get(`/urun/${product.slug}`)
    assert.equal(page.status, 200)
    assert.equal(canonical(page.html), `${production}/urun/${product.slug}`)
    assert.ok(page.html.includes('id="product-guide-heading"'), 'individual guide absent')
    const parsed = schemas(page.html), schema = parsed.find(value => value['@type'] === 'Product')
    assert.ok(schema, 'Product JSON-LD absent'); assert.equal(schema.name, product.name)
    assert.equal(schema.offers.priceCurrency, 'TRY'); assert.ok(Number(schema.offers.price) > 0)
    assert.equal(schema.offers.url, canonical(page.html))
    assert.ok(!schema.offers.priceValidUntil)
    if (schema.aggregateRating) { assert.ok(schema.aggregateRating.ratingValue >= 1 && schema.aggregateRating.ratingValue <= 5); assert.ok(schema.aggregateRating.reviewCount > 0) }
    const breadcrumb = parsed.find(value => value['@type'] === 'BreadcrumbList')
    assert.equal(breadcrumb.itemListElement.at(-1).item, canonical(page.html))
    for (const crumb of breadcrumb.itemListElement.slice(0, -1)) assert.ok(page.html.includes(`href="${new URL(crumb.item).pathname}"`), 'schema breadcrumb missing visible link')
    return { status: page.status, price: schema.offers.price, availability: schema.offers.availability, aggregateRating: schema.aggregateRating || null, breadcrumbs: breadcrumb.itemListElement.map(value => value.item) }
  })
}
for (const path of ['/sepet', '/checkout', '/giris', '/kayit', '/sifremi-unuttum', '/sifre-yenile', '/payment/callback', '/tum-urunler?search=oje', '/tum-urunler?sort=price-low', '/kategori/tirnak?sort=price-low']) {
  await check(`noindex ${path}`, async () => {
    const page = await get(path)
    assert.equal(page.status, 200)
    assert.ok(robots(page.html).some(rule => rule.name === 'robots' && rule.value.includes('noindex')))
    assert.ok(robots(page.html).some(rule => rule.name === 'googlebot' && rule.value.includes('noindex')))
    return { status: page.status, robots: robots(page.html), xRobotsTag: page.headers['x-robots-tag'] || null }
  })
}
for (const path of ['/urun/seo-test-does-not-exist', '/kategori/seo-test-does-not-exist', '/kategori/sac-bakimi/toz-toplayici', '/tum-urunler?page=99999', '/kategori/tirnak?page=99999']) {
  await check(`404 ${path}`, async () => { const page = await get(path); assert.equal(page.status, 404); return { status: page.status } })
}
await check('legacy category redirect', async () => { const page = await get('/kategori/tirnak/toz-toplayici'); assert.equal(page.status, 308); assert.equal(new URL(page.headers.location, origin).pathname, categoryPath('toz-toplayici')); return { status: page.status, location: page.headers.location } })
await check('complete sitemap equals current public catalog', async () => {
  const [page, products, categories] = await Promise.all([get('/sitemap.xml'), publicRows('products', 'slug,in_stock'), publicRows('categories', 'slug,parent_slug')])
  assert.equal(page.status, 200)
  const urls = [...page.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replace(/&amp;/g, '&'))
  assert.equal(new Set(urls).size, urls.length)
  assert.ok(urls.every(url => new URL(url).origin === production))
  assert.ok(!urls.some(url => /\/(sepet|checkout|giris|kayit|sifre-yenile|sifremi-unuttum|hesabim|admin|payment)(\/|$)/.test(new URL(url).pathname)))
  for (const product of products) assert.ok(urls.includes(`${production}/urun/${encodeURIComponent(product.slug)}`), `missing ${product.slug}`)
  const actualCategories = new Map(categories.filter(row => row.slug !== '_menu_sort').map(row => [row.slug, row]))
  for (const row of actualCategories.values()) {
    const chain = [], seen = new Set(); let current = row
    while (current && !seen.has(current.slug)) { chain.unshift(current.slug); seen.add(current.slug); if (!current.parent_slug) break; current = actualCategories.get(current.parent_slug) }
    if (current && !current.parent_slug) assert.ok(urls.includes(`${production}/kategori/${chain.map(encodeURIComponent).join('/')}`))
  }
  return { urls: urls.length, products: products.length, categories: actualCategories.size, outOfStockProducts: products.filter(row => !row.in_stock).length }
})
await check('robots permits noindex pages to be crawled', async () => { const page = await get('/robots.txt'); assert.equal(page.status, 200); assert.ok(!/Disallow: \/(_next|checkout|payment)/.test(page.html)); assert.ok(page.html.includes(`${production}/sitemap.xml`)); return { robots: page.html } })

await check('mobile cart to checkout renders without submitting an order', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    let paymentRequests = 0
    await page.route('**/api/payment', route => { paymentRequests += 1; return route.abort() })
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    const product = baseline.candidateProducts[0]
    await page.goto(`${origin}/urun/${product.slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.getByRole('button', { name: 'Sepete Ekle', exact: true }).click()
    await page.goto(`${origin}/sepet`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.getByRole('heading', { name: 'Sepetim', exact: true }).waitFor({ timeout: 15000 })
    assert.ok((await page.locator('body').innerText()).includes(product.name), 'selected product absent from cart')
    await page.goto(`${origin}/checkout`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.getByRole('heading', { name: 'Kişisel Bilgiler', exact: true }).waitFor({ timeout: 15000 })
    const rejectCookies = page.getByRole('button', { name: 'Reddet', exact: true })
    if (await rejectCookies.isVisible()) await rejectCookies.click()
    await page.getByPlaceholder('Adınız', { exact: true }).fill('SEO')
    await page.getByPlaceholder('Soyadınız', { exact: true }).fill('Kontrol')
    await page.getByPlaceholder('ornek@email.com').fill('seo-test@example.invalid')
    await page.getByPlaceholder('5XX XXX XX XX').fill('5000000000')
    await page.getByPlaceholder('11 haneli TC kimlik numaranız').fill('00000000000')
    await page.getByRole('button', { name: 'Teslimat Bilgilerine Geç', exact: true }).click()
    await page.getByRole('heading', { name: 'Teslimat Adresi', exact: true }).waitFor()
    await page.getByPlaceholder('Mahalle, sokak, bina no, daire no').fill('Yerel SEO kontrolü, gerçek teslimat adresi değildir')
    await page.getByPlaceholder('İl', { exact: true }).fill('İstanbul')
    await page.getByPlaceholder('İlçe', { exact: true }).fill('Fatih')
    await page.getByRole('button', { name: 'Ödeme Bilgilerine Geç', exact: true }).click()
    await page.getByRole('heading', { name: 'Ödeme Bilgileri', exact: true }).waitFor()
    assert.equal(paymentRequests, 0, 'payment endpoint must never be called in acceptance check')
    assert.equal(errors.length, 0, errors.join('; '))
    await page.screenshot({ path: 'docs/seo-checkout-mobile.png', fullPage: true })
    return { product: product.slug, checkoutRendered: true, shippingStep: true, paymentForm: true, orderSubmitted: false, paymentRequests, pageErrors: errors }
  } finally { await browser.close() }
})
await fs.writeFile(output, JSON.stringify({ checkedAt: new Date().toISOString(), origin, production, checks: outcomes, passed: outcomes.every(value => value.passed), note: 'Local production-build acceptance, public anonymous catalog. No live payment/order submitted. Search Console and external Google Rich Results validation not covered.' }, null, 2))
if (outcomes.some(value => !value.passed)) process.exitCode = 1
