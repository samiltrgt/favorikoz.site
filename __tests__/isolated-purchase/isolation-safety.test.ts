// Separate safety gate: this file imports no application modules.
test('Jest sandbox retains native network, process and env-file guards', () => {
  expect((globalThis as any).__purchaseIsolation.active).toBe(true)
  const actions = [
    () => require('node:https').get('https://example.invalid'),
    () => require('node:net').connect(443, 'example.invalid'),
    () => require('node:tls').connect(443, 'example.invalid'),
    () => require('node:dgram').createSocket('udp4'),
    () => require('node:dns').lookup('example.invalid', () => {}),
    () => require('node:child_process').exec('unused'),
    () => require('node:fs').readFileSync('.env.local'),
    () => new XMLHttpRequest(),
    () => new WebSocket('wss://example.invalid'),
    () => fetch('https://example.invalid'),
  ]
  const guard = (globalThis as any).__purchaseIsolation
  const before = guard.attempts.length
  for (const action of actions) expect(action).toThrow('ISOLATION_BLOCKED:')
  expect(guard.attempts.length - before).toBe(actions.length)
  // The normal afterEach forbids ANY denied attempt in application tests. Only
  // this explicitly named safety test consumes its deliberate denial records.
  guard.attempts.splice(before)
  expect(Object.keys(process.env).some(k => /SUPABASE|IYZICO|META|DATABASE_URL|RESEND|CRON_SECRET/.test(k))).toBe(false)
})
