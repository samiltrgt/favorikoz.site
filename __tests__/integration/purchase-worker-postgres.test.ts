jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: jest.fn() }))
jest.mock('@/lib/tracking/meta', () => ({ deliverMeta: jest.fn(), buildMetaUserData: () => ({ em: ['synthetic-hash'] }) }))
jest.mock('@/lib/tracking/google', () => ({ deliverGooglePurchase: jest.fn() }))
jest.mock('@/lib/tracking/ltv', () => ({ getPredictedLtv: jest.fn(async () => 25) }))

import { execFileSync } from 'child_process'
import { drainTrackingOutbox } from '@/lib/tracking/outbox'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { deliverMeta } from '@/lib/tracking/meta'
import { deliverGooglePurchase } from '@/lib/tracking/google'
import { getPredictedLtv } from '@/lib/tracking/ltv'

const root = process.env.PHASE6_PG_ROOT
const integration = root ? describe : describe.skip
function bridge(command: Record<string, unknown>) {
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'test', PYTHONDONTWRITEBYTECODE: '1' }
  for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH']) if (process.env[key]) env[key] = process.env[key]
  return JSON.parse(execFileSync('python', ['scripts/staging/purchase_rpc_bridge.py', '--root', root!], {
    input: JSON.stringify(command), encoding: 'utf8', windowsHide: true, env, timeout: 15000,
  }))
}
integration('actual TypeScript Purchase worker with isolated PostgreSQL RPCs and mocked providers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(deliverMeta).mockResolvedValue()
    jest.mocked(deliverGooglePurchase).mockResolvedValue()
    jest.mocked(getPredictedLtv).mockResolvedValue(25)
    global.fetch = jest.fn(() => { throw new Error('real_network_forbidden') })
    jest.mocked(createSupabaseAdmin).mockReturnValue({
      rpc: async (name: string, args: Record<string, unknown>) => bridge({ operation: 'rpc', name, args }),
      from: () => { throw new Error('unexpected_unguarded_table_access') },
    } as any)
  })
  afterEach(() => expect(fetch).not.toHaveBeenCalled())
  test('two actual worker calls dispatch one event', async () => {
    const order = bridge({ operation: 'fixture' })
    const results = await Promise.all([drainTrackingOutbox({ orderNumber: order.name }), drainTrackingOutbox({ orderNumber: order.name })])
    expect(results.reduce((sum, item) => sum + item.claimed, 0)).toBe(1)
    expect(deliverMeta).toHaveBeenCalledTimes(1); expect(deliverGooglePurchase).toHaveBeenCalledTimes(1)
  }, 30000)
  test('a lost checkpoint followed by lease expiry does not send Meta twice', async () => {
    const order = bridge({ operation: 'fixture' })
    // Replace the client factory, not the database state: the SQL reservation
    // really remains dispatching when the simulated transport loses the ack.
    jest.mocked(createSupabaseAdmin).mockReturnValue({
      rpc: async (name: string, args: Record<string, unknown>) => name === 'complete_tracking_purchase'
        ? { error: { message: 'checkpoint_unavailable' } } : bridge({ operation: 'rpc', name, args }),
      from: () => { throw new Error('unexpected_table_access') },
    } as any)
    await expect(drainTrackingOutbox({ orderNumber: order.name })).rejects.toThrow('tracking_batch_incomplete')
    expect(deliverMeta).toHaveBeenCalledTimes(1)
    bridge({ operation: 'mutate', order_id: order.id, mutation: 'expire' })
    jest.mocked(createSupabaseAdmin).mockReturnValue({
      rpc: async (name: string, args: Record<string, unknown>) => bridge({ operation: 'rpc', name, args }),
      from: () => { throw new Error('unexpected_table_access') },
    } as any)
    expect((await drainTrackingOutbox({ orderNumber: order.name })).failed).toBe(1)
    expect(deliverMeta).toHaveBeenCalledTimes(1); expect(deliverGooglePurchase).not.toHaveBeenCalled()
  }, 30000)
  test('valid receipt sends each platform once and never reclaims sent rows', async () => {
    const order = bridge({ operation: 'fixture' })
    expect(await drainTrackingOutbox({ orderNumber: order.name })).toEqual({ claimed: 1, sent: 1, failed: 0 })
    expect(deliverMeta).toHaveBeenCalledTimes(1); expect(deliverGooglePurchase).toHaveBeenCalledTimes(1)
    expect(deliverMeta).toHaveBeenCalledWith(expect.objectContaining({ event_id: order.name, custom_data: expect.objectContaining({ value: 125, currency: 'TRY' }) }))
    expect((await drainTrackingOutbox({ orderNumber: order.name })).claimed).toBe(0)
  }, 30000)
  test.each(['legacy', 'bad-payload'])('%s Purchase is retained in terminal quarantine without a provider request', async mode => {
    const order = bridge({ operation: 'fixture', mode })
    expect((await drainTrackingOutbox({ orderNumber: order.name })).failed).toBe(1)
    expect(deliverMeta).not.toHaveBeenCalled(); expect(deliverGooglePurchase).not.toHaveBeenCalled()
    expect((await drainTrackingOutbox({ orderNumber: order.name })).claimed).toBe(0)
  }, 30000)
  test('503 retries Meta only after backoff; GA4 checkpoint and event ID survive', async () => {
    const order = bridge({ operation: 'fixture' })
    jest.mocked(deliverMeta).mockRejectedValueOnce(new Error('meta_http_503'))
    expect((await drainTrackingOutbox({ orderNumber: order.name })).sent).toBe(0)
    expect((await drainTrackingOutbox({ orderNumber: order.name })).claimed).toBe(0)
    bridge({ operation: 'mutate', order_id: order.id, mutation: 'due' })
    expect((await drainTrackingOutbox({ orderNumber: order.name })).sent).toBe(1)
    expect(deliverMeta).toHaveBeenCalledTimes(2); expect(deliverGooglePurchase).toHaveBeenCalledTimes(1)
    const events = jest.mocked(deliverMeta).mock.calls.map(([event]) => [event.event_id, event.event_time])
    expect(events[0]).toEqual(events[1])
  }, 30000)
  test.each(['refund', 'withdraw'])('%s committed during LTV prevents delivery at final SQL gate', async mutation => {
    const order = bridge({ operation: 'fixture' })
    jest.mocked(getPredictedLtv).mockImplementationOnce(async () => {
      bridge({ operation: 'mutate', order_id: order.id, mutation }); return 25
    })
    await expect(drainTrackingOutbox({ orderNumber: order.name })).rejects.toThrow('tracking_batch_incomplete')
    expect(getPredictedLtv).toHaveBeenCalledTimes(1)
    expect(deliverMeta).not.toHaveBeenCalled(); expect(deliverGooglePurchase).not.toHaveBeenCalled()
  }, 30000)
})
