import { createSupabaseAdmin } from '@/lib/supabase/server'
import { loadHomeLayoutConfig, DEFAULT_HOME_LAYOUT } from '@/lib/home-layout'

jest.mock('@/lib/supabase/server', () => ({ createSupabaseAdmin: jest.fn() }))
const result = (data: unknown, error: unknown = null) => {
  const query: any = { select: () => query, eq: () => query, limit: () => query, maybeSingle: async () => ({ data, error }) }
  jest.mocked(createSupabaseAdmin).mockReturnValue({ from: () => query } as any)
}

it('uses defaults only when no layout has been saved', async () => {
  result(null)
  expect(await loadHomeLayoutConfig()).toEqual(DEFAULT_HOME_LAYOUT)
})

it('does not substitute automatic selections on a database read failure', async () => {
  result(null, new Error('database unavailable'))
  await expect(loadHomeLayoutConfig()).rejects.toThrow('database unavailable')
})

it('does not swallow a dynamic rendering error wrapped by the database client', async () => {
  const error = { message: 'Dynamic server usage: no-store fetch', code: '' }
  result(null, error)
  await expect(loadHomeLayoutConfig()).rejects.toEqual(error)
})

it('reads the saved products in their configured order', async () => {
  result({ subtitle: JSON.stringify({ ...DEFAULT_HOME_LAYOUT, rows: [{ slug: 'tirnak', title: 'Tırnak', productIds: ['second', 'first'] }] }) })
  expect((await loadHomeLayoutConfig()).rows[0].productIds).toEqual(['second', 'first'])
})
