import { findExistingExcelProduct } from '../../scripts/lib/excel-product-match'

const rows = [
  { id: 'wrong', name: 'Jel 101', barcode: 'FK001098', deleted_at: null, created_at: '2025-01-01' },
  { id: 'correct', name: 'Jel 109', barcode: 'FK001106', deleted_at: null, created_at: '2025-01-01' },
  { id: 'duplicate', name: 'Jel 109', barcode: 'FK001130', deleted_at: null, created_at: '2025-02-01' },
]

function client() {
  return { from: () => {
    let matches = [...rows]
    const query: any = {
      select: () => query,
      eq: (key: keyof typeof rows[0], value: string) => { matches = matches.filter(row => row[key] === value); return query },
      is: () => query,
      not: () => { matches = []; return query },
      order: () => query,
      limit: async (n: number) => ({ data: matches.slice(0, n), error: null }),
    }
    return query
  } }
}

it('matches a moved Excel row by name rather than overwriting the old FK barcode owner', async () => {
  const product = await findExistingExcelProduct(client(), { name: 'Jel 109', barcode: 'FK001098' })
  expect(product?.id).toBe('correct')
})

it('does not borrow an unrelated product when a generated barcode exists but the name is new', async () => {
  expect(await findExistingExcelProduct(client(), { name: 'New product', barcode: 'FK001098' })).toBeNull()
})

it('uses a real barcode even when the source name changes', async () => {
  const existing = { id: 'real', name: 'Old name', barcode: '8691234567890', created_at: '2025-01-01', deleted_at: null }
  const mock = { from: () => { const q: any = { select: () => q, eq: () => q, is: () => q, order: () => q, limit: async () => ({ data: [existing], error: null }) }; return q } }
  expect((await findExistingExcelProduct(mock, { name: 'Updated name', barcode: existing.barcode }))?.id).toBe('real')
})
