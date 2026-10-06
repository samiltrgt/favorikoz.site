// Loaded only by the isolated test server. Platform requests go to local collectors.
if (process.env.TRACKING_E2E_FIXTURE_URL) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
    const collector = url.hostname === 'graph.facebook.com' ? '/collect/meta'
      : url.hostname === 'www.google-analytics.com' ? '/collect/google' : null
    if (collector) {
      const target = `${process.env.TRACKING_E2E_FIXTURE_URL}${collector}`
      return originalFetch(input instanceof Request ? new Request(target, input) : target, init)
    }
    if (!['localhost', '127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) {
      return Promise.reject(new Error('isolated_test_external_request_blocked'))
    }
    return originalFetch(input, init)
  }
}
