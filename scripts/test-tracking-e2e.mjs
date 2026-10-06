import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { randomUUID, createHash } from 'node:crypto'
import { chromium } from '@playwright/test'
import { createTrackingFixture } from './tracking-e2e-fixture.mjs'

// Run real Next routes + browser UI against isolated PostgreSQL and provider doubles.
// This does not establish Meta EMQ, a bank authorization, or GA4 report delivery.
const fixture = await createTrackingFixture()
const portProbe = createServer()
await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve))
const port = portProbe.address().port
await new Promise(resolve => portProbe.close(resolve))
const origin = `http://localhost:${port}`
const artifacts = new URL('../test-results/tracking/', import.meta.url)
await mkdir(artifacts, { recursive: true })
const preload = fileURLToPath(new URL('./tracking-e2e-preload.cjs', import.meta.url)).replace(/\\/g, '/')
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port)], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: { ...process.env, NODE_ENV: 'development', NODE_OPTIONS: `--require "${preload}"`,
    NEXT_TELEMETRY_DISABLED: '1', TRACKING_E2E_FIXTURE_URL: fixture.url,
    NEXT_PUBLIC_BASE_URL: origin, NEXT_PUBLIC_SUPABASE_URL: fixture.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-anon', SUPABASE_SERVICE_ROLE_KEY: 'isolated-service',
    IYZICO_API_KEY: 'isolated-iyzico', IYZICO_SECRET_KEY: 'isolated-iyzico-secret', IYZICO_BASE_URL: fixture.url,
    IYZICO_CALLBACK_URL: `${origin}/api/payment/3ds-callback`, RESEND_API_KEY: '', NES_API_KEY: '',
    NEXT_PUBLIC_TRACKING_MODE: 'direct', NEXT_PUBLIC_META_PIXEL_ID: '123456789', META_PIXEL_ID: '123456789',
    META_CAPI_ACCESS_TOKEN: 'isolated-meta', META_TEST_EVENT_CODE: 'TEST_LOCAL',
    NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-TRACKTEST', GA4_MEASUREMENT_ID: 'G-TRACKTEST', GA4_API_SECRET: 'isolated-ga4',
    NEXT_PUBLIC_GOOGLE_ADS_ID: 'AW-123456789', NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: 'isolated-label',
    CRON_SECRET: 'isolated-cron',
  }, windowsHide: true,
})
let output = ''
server.stdout.on('data', chunk => { output += chunk })
server.stderr.on('data', chunk => { output += chunk })
let browser
try {
  const started = Date.now()
  while (true) {
    if (server.exitCode !== null) throw new Error('Next test server exited')
    try {
      const response = await fetch(`${origin}/urun/tracking-e2e-product`, { signal: AbortSignal.timeout(2000) })
      if (response.ok) break
    } catch { /* Wait for the initial compile. */ }
    if (Date.now() - started > 90000) throw new Error('Next test server did not become ready')
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  browser = await chromium.launch({ channel: process.env.TRACKING_TEST_BROWSER || 'chrome', headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const pixelRequests = [], clientEvents = [], errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/e') clientEvents.push(request.postDataJSON())
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === 'connect.facebook.net') {
      // Emulate the vendor SDK contract and observe browser network emissions.
      return route.fulfill({ contentType: 'application/javascript', body: `
        window.__pixelCalls=[];
        window.fbq.callMethod=function(){
          var args=Array.from(arguments); window.__pixelCalls.push(args);
          if(args[0]==='track') fetch('https://www.facebook.com/tr/?ev='+encodeURIComponent(args[1])+'&eid='+encodeURIComponent(args[3].eventID));
        };
        window.fbq.queue.splice(0).forEach(function(args){window.fbq.callMethod.apply(null,args)});
      ` })
    }
    if (url.hostname === 'www.facebook.com') {
      pixelRequests.push({ name: url.searchParams.get('ev'), id: url.searchParams.get('eid') })
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } })
    }
    if (url.hostname === 'www.googletagmanager.com') {
      return route.fulfill({ contentType: 'application/javascript', body: '' })
    }
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue()
    return route.fulfill({ status: 204 })
  })
  await page.goto(`${origin}/urun/tracking-e2e-product`)
  await page.getByRole('button', { name: 'Sepete Ekle', exact: true }).click()
  assert.equal(clientEvents.length, 0)
  assert.equal(pixelRequests.length, 0)
  console.log('PASS denied consent: add-to-cart creates no Pixel/CAPI event')

  await page.getByRole('button', { name: 'Kabul et', exact: true }).click()
  await page.waitForFunction(() => document.cookie.includes('fk_consent_ack=11') && !document.cookie.includes('fk_consent_pending=1'))
  await context.addCookies([{ name: '_fbp', value: 'fb.1.1700000000000.123456', url: origin }, { name: '_ga', value: 'GA1.1.12345.67890', url: origin }])
  const response = await page.reload()
  const edgeId = response.headers()['x-event-id']
  assert.match(edgeId, /^evt_/)
  await page.waitForFunction(() => (window.__pixelCalls || []).some(args => args[0] === 'track' && args[1] === 'ViewContent'))
  await page.getByRole('button', { name: 'Sepete Ekle', exact: true }).click()
  await page.waitForFunction(() => (window.__pixelCalls || []).some(args => args[1] === 'AddToCart'))
  await page.goto(`${origin}/checkout`)
  await page.waitForFunction(() => (window.__pixelCalls || []).some(args => args[1] === 'InitiateCheckout'))

  const ownerCookies = await context.cookies(origin)
  const owner = ownerCookies.find(cookie => cookie.name === 'fk_tracking_owner').value
  const ownerHash = createHash('sha256').update(owner.toLowerCase()).digest('hex')
  const version = Number(ownerCookies.find(cookie => cookie.name === 'fk_consent_version').value)
  const orderId = randomUUID(), orderNumber = `E2E-${randomUUID()}`, token = `e2e-${randomUUID()}`
  const tracking = { consent: { marketing: true, analytics: true }, consent_owner: ownerHash, consent_version: version,
    fbp: 'fb.1.1700000000000.123456', ip: '127.0.0.1', user_agent: 'Isolated Chrome test',
    client_id: '12345.67890', session_id: '12345', source_url: `${origin}/checkout` }
  await fixture.db.query(`insert into orders(id,order_number,customer_name,customer_email,shipping_address,items,subtotal,shipping_cost,total,payment_method,payment_token,iyzico_basket_id,tracking,confirmation_email_sent_at)
    values($1,$2,'Tracking Test','tracking@example.invalid','{}',$3,10000,0,10000,'credit_card',$4,'tracking-e2e-basket',$5,now())`,
    [orderId, orderNumber, JSON.stringify([{ product_id: '11111111-1111-4111-8111-111111111111', price: 10000, quantity: 1 }]), token, JSON.stringify(tracking)])
  const callback = await context.request.post(`${origin}/api/payment/3ds-callback`, {
    form: { conversationId: token, paymentId: 'fixture-payment', mdStatus: '1' }, maxRedirects: 0,
  })
  assert.equal(callback.status(), 302)
  assert(!callback.headers().location.includes('failed'), callback.headers().location)
  await page.goto(callback.headers().location)
  await page.waitForFunction(() => (window.__pixelCalls || []).some(args => args[1] === 'Purchase'))
  const waitUntil = Date.now() + 10000
  while (!fixture.meta.some(body => body.data?.some(event => event.event_id === orderNumber)) && Date.now() < waitUntil) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const purchase = fixture.meta.flatMap(body => body.data || []).find(event => event.event_id === orderNumber)
  assert(purchase, 'server Purchase was not delivered')
  assert.equal(purchase.custom_data.value, 100)
  assert.equal(purchase.custom_data.predicted_ltv, 250)
  assert(pixelRequests.some(event => event.name === 'Purchase' && event.id === orderNumber))
  const queue = await fixture.db.query('select status,delivery from tracking_outbox where event_id=$1', [orderNumber])
  assert.equal(queue.rows.length, 1)
  assert.equal(queue.rows[0].status, 'sent')
  assert.deepEqual(queue.rows[0].delivery, { meta: 'sent', ga4: 'sent' })
  const google = fixture.google.find(body => body.events?.[0]?.params?.transaction_id === orderNumber)
  assert(google)
  assert.equal(google.events[0].params.value, 100)
  assert(!JSON.stringify(google).includes('tracking@example.invalid'))
  console.log('PASS 3DS callback → atomic SQL outbox → CAPI + GA4 → browser Purchase; value=100 TRY, predicted_ltv=250')

  const count = fixture.meta.filter(body => body.data?.some(event => event.event_id === orderNumber)).length
  await context.request.post(`${origin}/api/payment/3ds-callback`, { form: { conversationId: token, paymentId: 'fixture-payment', mdStatus: '1' }, maxRedirects: 0 })
  await page.reload()
  assert.equal(fixture.meta.filter(body => body.data?.some(event => event.event_id === orderNumber)).length, count)
  assert.equal(pixelRequests.filter(event => event.name === 'Purchase' && event.id === orderNumber).length, 1)
  console.log('PASS duplicate callback and reload: one outbox row, one server Purchase, one browser Purchase')
  for (const name of ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout']) {
    const event = clientEvents.find(event => event.eventName === name && (name !== 'PageView' || event.eventId === edgeId))
    assert(event, `missing browser ${name}`)
    const deadline = Date.now() + 10000
    while (!fixture.meta.some(body => body.data?.some(row => row.event_id === event.eventId)) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50))
    assert(fixture.meta.some(body => body.data?.some(row => row.event_id === event.eventId && row.event_name === name)), `missing server ${name}`)
    assert(pixelRequests.some(row => row.id === event.eventId && row.name === name), `mismatched Pixel ${name}`)
  }
  console.log('PASS Edge PageView, ViewContent, AddToCart and InitiateCheckout: identical Pixel/CAPI IDs')

  const prefetch = await context.request.get(`${origin}/urun/tracking-e2e-product`, { headers: { purpose: 'prefetch', rsc: '1', 'next-router-prefetch': '1' } })
  assert.equal(prefetch.headers()['x-event-id'], undefined)
  const admin = await context.request.get(`${origin}/admin`, { maxRedirects: 0 })
  assert.equal(admin.status(), 307)
  assert(new URL(admin.headers().location, origin).pathname === '/admin/login')
  console.log('PASS active middleware: prefetch has no event ID; anonymous admin request redirects to login')

  for (const platform of ['meta', 'google']) {
    const response = await page.request.get(`${origin}/api/feeds/${platform}`)
    assert.equal(response.status(), 200)
    assert.match(response.headers()['content-type'], /application\/xml/)
    const xml = await response.text()
    const parsed = await page.evaluate(xml => {
      const document = new DOMParser().parseFromString(xml, 'application/xml')
      return { errors: document.querySelectorAll('parsererror').length, items: document.querySelectorAll('item').length }
    }, xml)
    assert.deepEqual(parsed, { errors: 0, items: 1 })
    assert(xml.includes('<g:price>100.00 TRY</g:price>'))
    console.log(`PASS ${platform} feed: HTTP 200, valid XML, matching product ID and price`)
  }
  await page.screenshot({ path: fileURLToPath(new URL('purchase.png', artifacts)), fullPage: true })
  await page.getByRole('button', { name: 'Çerez tercihleri', exact: true }).click()
  await page.getByRole('button', { name: 'Reddet', exact: true }).click()
  await page.waitForFunction(() => !document.cookie.includes('fk_consent_pending=1'))
  const savedConsent = await fixture.db.query('select marketing,analytics from tracking_consent where owner_hash=$1', [ownerHash])
  assert.deepEqual(savedConsent.rows[0], { marketing: false, analytics: false })
  const requestCount = clientEvents.length, pixelCount = pixelRequests.length
  await page.goto(`${origin}/urun/tracking-e2e-product`)
  await page.getByRole('button', { name: 'Sepete Ekle', exact: true }).click()
  assert.equal(clientEvents.length, requestCount)
  assert.equal(pixelRequests.length, pixelCount)
  console.log('PASS consent withdrawal: stored consent denied, no subsequent Pixel/CAPI requests')
  assert.deepEqual(errors, [])
  await writeFile(new URL('evidence.json', artifacts), JSON.stringify({ isolated: true, orderNumber, edgeId, pixelRequests, clientEvents: clientEvents.map(({ eventName, eventId }) => ({ eventName, eventId })), purchase: { value: purchase.custom_data.value, predicted_ltv: purchase.custom_data.predicted_ltv }, pageErrors: errors }, null, 2))
  console.log('PASS Chrome runtime: no page errors; evidence saved in test-results/tracking')
} catch (error) {
  console.error('FAIL tracking browser integration:', error.message)
  process.exitCode = 1
} finally {
  await writeFile(new URL('server.log', artifacts), output)
  if (browser) await browser.close()
  if (process.platform === 'win32') await new Promise(resolve => { const cleanup = spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true }); cleanup.on('exit', resolve) })
  else server.kill('SIGTERM')
  await fixture.close()
}
