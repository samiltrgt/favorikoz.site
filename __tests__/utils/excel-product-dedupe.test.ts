import { planExcelDuplicates } from '../../scripts/lib/excel-product-dedupe'

const product = { name: 'Tırnak Seti', barcode: 'FK001130', created_at: '2026-01-01', image: 'https://images.unsplash.com/placeholder', images: [] }

it('keeps the original listing and recovers the uploaded image from its Excel duplicate', () => {
  const keeper = { ...product, id: 'original', stock_quantity: 0, price: 25000 }
  const copy = { ...product, id: 'copy', barcode: 'FK001098', name: ' TIRNAK   SETİ ', created_at: '2026-02-01', image: 'https://shop.com/product.png', stock_quantity: 100, price: 20000 }
  const { actions } = planExcelDuplicates([copy, keeper])
  expect(actions).toHaveLength(1)
  expect(actions[0].keeper).toBe(keeper)
  expect(actions[0].keeper.stock_quantity).toBe(0)
  expect(actions[0].keeper.price).toBe(25000)
  expect(actions[0].imageSource).toBe(copy)
  expect(actions[0].duplicates).toEqual([copy])
  expect(planExcelDuplicates([keeper]).actions).toEqual([])
})

it('leaves same-name products with different real barcodes intact', () => {
  const rows = [{ ...product, id: 'red', barcode: '8690001' }, { ...product, id: 'blue', barcode: '8690002' }]
  expect(planExcelDuplicates(rows)).toEqual({ actions: [], skippedGroups: 1 })
})

it('keeps different nail gel numbers as separate products', () => {
  expect(planExcelDuplicates([{ ...product, id: '101', name: 'Jel 101' }, { ...product, id: '102', name: 'Jel 102' }]).actions).toEqual([])
})
