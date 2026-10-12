import { createSupabaseAdmin } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

jest.unmock('@/lib/supabase/server')
jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))

test('admin RPC requests bypass cached results and preserve authentication and body', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  const fetchMock = jest.fn().mockResolvedValue({ ok: true })
  const previousFetch = global.fetch
  global.fetch = fetchMock
  try {
    createSupabaseAdmin()
    const options = (createServerClient as jest.Mock).mock.calls.at(-1)[2]
    const init = { method: 'POST', headers: { Authorization: 'Bearer test-service-key' }, body: '{"p_limit":4}', cache: 'force-cache' }
    await options.global.fetch('https://test.supabase.co/rest/v1/rpc/claim_email_notifications', init)
    await options.global.fetch('https://test.supabase.co/rest/v1/rpc/claim_email_notifications', init)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith('https://test.supabase.co/rest/v1/rpc/claim_email_notifications', { ...init, cache: 'no-store' })
  } finally {
    global.fetch = previousFetch
  }
})
