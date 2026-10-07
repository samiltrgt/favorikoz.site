import { isValidSalePrice, parseExcelPrice } from '../../scripts/lib/excel-price'

describe('parseExcelPrice', () => {
  it.each([
    [175, 175],
    ['175.0', 175],
    ['319.90', 319.9],
    ['6.500,00', 6500],
    ['6,500.00', 6500],
    ['₺ 319,90', 319.9],
  ])('parses %s as %s TL', (input, expected) => {
    expect(parseExcelPrice(input)).toBe(expected)
  })

  it.each(['150.0.', '1,2,3', 'abc', '', 'Infinity', '1.2.3'])('rejects malformed value %s', (input) => {
    expect(parseExcelPrice(input)).toBeNull()
  })

  it('requires a finite, positive sale price', () => {
    expect(isValidSalePrice(0)).toBe(false)
    expect(isValidSalePrice(-1)).toBe(false)
    expect(isValidSalePrice(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isValidSalePrice(0.01)).toBe(true)
    expect(isValidSalePrice(0.001)).toBe(false)
    expect(isValidSalePrice(Number.MAX_SAFE_INTEGER)).toBe(false)
  })
})
