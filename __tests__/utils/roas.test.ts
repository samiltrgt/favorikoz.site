import { summarizeRoas, validDay } from '@/lib/analytics/roas'
test('ROAS uses paid TRY and excludes cancelled payments, without invented spend', () => {
  const paid = { payment_status: 'completed', status: 'delivered', total: 65000, items: [], shipping_cost: 0, tracking: { utm_source: 'meta', utm_campaign: 'A' } }
  const rows = summarizeRoas([paid, { ...paid, status: 'cancelled' }, { ...paid, payment_status: 'pending' }], [{ source: 'meta', campaign: 'A', amount: 100, platform_revenue: 900 }])
  expect(rows[0]).toMatchObject({ orders: 1, revenue: 650, spend: 100, roas: 6.5, platformRoas: 9 })
  expect(summarizeRoas([paid], [])[0].roas).toBeNull()
})
test('calendar dates reject nonexistent days', () => {
  expect(validDay('2026-02-31')).toBe(false)
  expect(validDay('2026-10-05')).toBe(true)
})
test('partial platform revenue cannot produce an invented low ROAS', () => {
  const rows = summarizeRoas([], [
    { source: 'meta', campaign: 'A', amount: 100, platform_revenue: 900 },
    { source: 'meta', campaign: 'A', amount: 100, platform_revenue: null },
    { source: 'google', campaign: 'B', amount: 50, platform_revenue: 0 },
  ])
  expect(rows.find(row => row.source === 'meta')).toMatchObject({ spend: 200, platformRevenue: null, platformRoas: null })
  expect(rows.find(row => row.source === 'google')).toMatchObject({ spend: 50, platformRevenue: 0, platformRoas: 0 })
})
test('order and spend attribution normalize sources and trim campaign without changing case', () => {
  const order = { payment_status: 'completed', status: 'paid', total: 65000, items: [], shipping_cost: 0, tracking: { utm_source: ' Meta ', utm_campaign: ' Summer ' } }
  const rows = summarizeRoas([order], [{ source: 'meta', campaign: 'Summer', amount: 100, platform_revenue: 900 }])
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({ source: 'meta', campaign: 'Summer', orders: 1, revenue: 650, spend: 100, roas: 6.5 })
  expect(summarizeRoas([order], [{ source: 'META ', campaign: ' summer ', amount: 100, platform_revenue: 900 }])).toHaveLength(2)
})
