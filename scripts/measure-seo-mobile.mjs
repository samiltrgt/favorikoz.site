import fs from 'node:fs/promises'
import { chromium } from '@playwright/test'

// Repeatable mobile laboratory measurement, not Lighthouse or field CWV.
// Usage: node scripts/measure-seo-mobile.mjs ORIGIN OUTPUT_PATH [PATH ...]
const [origin, output, ...paths] = process.argv.slice(2)
if (!origin || !output || paths.length === 0) throw new Error('Provide origin, output JSON and page paths')
const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const path of paths) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    const session = await context.newCDPSession(page)
    await session.send('Network.enable')
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 })
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    const failures = []
    page.on('pageerror', error => failures.push(error.message))
    await page.addInitScript(() => {
      window.seoMetrics = { lcp: null, cls: 0, lcpElement: null }
      let sessionStart = 0, sessionEnd = 0, sessionValue = 0
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          window.seoMetrics.lcp = entry.startTime
          window.seoMetrics.lcpElement = entry.element?.outerHTML.slice(0, 350) || null
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue
          if (entry.startTime - sessionEnd < 1000 && entry.startTime - sessionStart < 5000) sessionValue += entry.value
          else { sessionStart = entry.startTime; sessionValue = entry.value }
          sessionEnd = entry.startTime
          window.seoMetrics.cls = Math.max(window.seoMetrics.cls, sessionValue)
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    try {
      const response = await page.goto(new URL(path, origin).href, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(6000)
      const result = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0]
        const resources = performance.getEntriesByType('resource')
        return {
          ...window.seoMetrics,
          ttfbMs: navigation?.responseStart,
          domContentLoadedMs: navigation?.domContentLoadedEventEnd,
          loadMs: navigation?.loadEventEnd,
          title: document.title,
          canonical: document.querySelector('link[rel="canonical"]')?.href || null,
          robots: [...document.querySelectorAll('meta[name="robots"],meta[name="googlebot"]')].map(el => ({ name: el.name, content: el.content })),
          h1: [...document.querySelectorAll('h1')].map(el => ({ text: el.textContent, visible: el.getBoundingClientRect().height > 2 })),
          images: resources.filter(entry => entry.initiatorType === 'img').map(entry => ({ url: entry.name, durationMs: entry.duration, transferBytes: entry.transferSize, decodedBytes: entry.decodedBodySize })),
          largestVisibleImages: [...document.images].filter(img => img.getBoundingClientRect().top < innerHeight).map(img => ({ url: img.currentSrc, naturalWidth: img.naturalWidth, displayWidth: img.clientWidth, loading: img.loading })),
          resourceCount: resources.length,
          transferredBytesVisibleToTiming: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
        }
      })
      results.push({ path, status: response?.status(), xRobotsTag: response?.headers()['x-robots-tag'] || null, ...result, pageErrors: failures })
      console.log(JSON.stringify({ path, status: response?.status(), lcpMs: result.lcp, cls: result.cls, loadMs: result.loadMs }))
    } catch (error) { results.push({ path, error: error.message }) }
    await context.close()
  }
} finally { await browser.close() }
await fs.writeFile(output, JSON.stringify({ measuredAt: new Date().toISOString(), origin, conditions: '390x844, DPR1, CPU4x, 150ms latency, 1.6Mbps download, cold context, 6s post-load observation; lab only. Cross-origin resource bytes may be unavailable.', results }, null, 2))
