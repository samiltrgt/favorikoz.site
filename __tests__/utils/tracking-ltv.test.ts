jest.mock('server-only', () => ({}), { virtual: true })
import { getPredictedLtv } from '@/lib/tracking/ltv'

function database(data: unknown[] | null, error: unknown = null) {
  const query: any = {
    select: jest.fn().mockReturnThis(), ilike: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data, error }),
  }
  return { from: jest.fn(() => query), query }
}
test('empty or unavailable history uses repeat purchase estimate rounded in TRY', async () => {
  expect(await getPredictedLtv(database([]), 'buyer@example.com', 1.23, 'current')).toBe(3.08)
  expect(await getPredictedLtv(database(null, { code: 'unavailable' }), 'buyer@example.com', 100, 'current')).toBe(250)
  const db = database([])
  expect(await getPredictedLtv(db, undefined, 100, 'current')).toBe(250)
  expect(db.from).not.toHaveBeenCalled()
})
test('historical paid amounts convert raw kurus into TRY and exclude current order', async () => {
  const db = database([
    { total: 10000, shipping_cost: 0, items: [] },
    { total: 20000, shipping_cost: 0, items: [] },
  ])
  expect(await getPredictedLtv(db, ' Buyer@Example.com ', 50, 'current')).toBe(470)
  expect(db.query.ilike).toHaveBeenCalledWith('customer_email', 'buyer@example.com')
  expect(db.query.eq).toHaveBeenCalledWith('payment_status', 'completed')
  expect(db.query.eq).toHaveBeenCalledWith('status', 'completed')
  expect(db.query.neq).toHaveBeenCalledWith('id', 'current')
})
test('decimal history keeps two decimal precision and escapes SQL LIKE metacharacters', async () => {
  const db = database([
    { total: 1999, shipping_cost: 0, items: [] },
    { total: 1234, shipping_cost: 0, items: [] },
  ])
  expect(await getPredictedLtv(db, 'Buyer_100%\\Test@Example.com', 1.23, 'current')).toBe(46.49)
  expect(db.query.ilike).toHaveBeenCalledWith('customer_email', 'buyer\\_100\\%\\\\test@example.com')
})
