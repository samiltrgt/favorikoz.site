import { catalogItem, catalogXml, validGtin } from '@/lib/analytics/catalog'
const row = { id: 'p1', slug: 'test', name: 'Bakım & <Krem>', price: 65000, image: '/test.jpg', stock_quantity: 2, barcode: '4006381333931' }
test('catalog keeps product identity and converts DB currency to TRY', () => {
  expect(catalogItem(row, 'https://example.com')).toMatchObject({ id: 'p1', price: '650.00 TRY', availability: 'in_stock', image_link: 'https://example.com/test.jpg', gtin: row.barcode })
})
test('XML escapes content and excludes invalid products rather than inventing price/images', () => {
  const xml = catalogXml([row, { ...row, id: 'bad', price: 0 }], 'https://example.com')
  expect(xml).toContain('Bakım &amp;')
  expect(xml).not.toContain('<g:id>bad</g:id>')
  expect(xml).not.toContain('<Krem>')
})
test('GTIN check digit is required and out of stock is preserved', () => {
  expect(validGtin('4006381333932')).toBeUndefined()
  expect(validGtin('SKU-1')).toBeUndefined()
  expect(catalogItem({ ...row, in_stock: false }, 'https://example.com')?.availability).toBe('out_of_stock')
})
