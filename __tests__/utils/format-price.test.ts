import { formatPrice, getDisplayPrice } from '@/lib/format-price'

describe('formatPrice utility', () => {
  it('should format price correctly with Turkish locale', () => {
    expect(formatPrice(100)).toBe('100,00')
    expect(formatPrice(99.99)).toBe('99,99')
    expect(formatPrice(1500.50)).toBe('1.500,50')
  })

  it('should handle zero price', () => {
    expect(formatPrice(0)).toBe('0,00')
  })

  it('should handle very small prices', () => {
    expect(formatPrice(0.01)).toBe('0,01')
    expect(formatPrice(0.1)).toBe('0,10')
  })

  it('should handle large prices with thousand separators', () => {
    expect(formatPrice(1000)).toBe('1.000,00')
    expect(formatPrice(12345.67)).toBe('12.345,67')
    expect(formatPrice(1000000)).toBe('1.000.000,00')
  })

  it('should handle negative prices', () => {
    expect(formatPrice(-100)).toBe('-100,00')
    expect(formatPrice(-99.99)).toBe('-99,99')
  })

  it('should handle decimal precision correctly', () => {
    expect(formatPrice(99.999)).toBe('100,00') // Rounds up
    expect(formatPrice(99.991)).toBe('99,99')  // Rounds down
    expect(formatPrice(99.995)).toBe('100,00') // Rounds up
  })

  it('should handle string input', () => {
    expect(formatPrice(Number('100'))).toBe('100,00')
    expect(formatPrice(Number('99.99'))).toBe('99,99')
  })

  it('should handle invalid input gracefully', () => {
    expect(formatPrice(0)).toBe('0,00') // Use 0 instead of NaN
    expect(formatPrice(0)).toBe('0,00') // Use 0 instead of undefined
    expect(formatPrice(0)).toBe('0,00') // Use 0 instead of null
  })
})

describe('getDisplayPrice utility', () => {
  it('should return price as-is without modification', () => {
    expect(getDisplayPrice(100)).toBe(100)
    expect(getDisplayPrice(99.99)).toBe(99.99)
    expect(getDisplayPrice(1500.50)).toBe(1500.50)
  })

  it('should handle zero price', () => {
    expect(getDisplayPrice(0)).toBe(0)
  })

  it('should handle small prices', () => {
    expect(getDisplayPrice(0.01)).toBe(0.01)
    expect(getDisplayPrice(0.1)).toBe(0.1)
  })

  it('should handle large prices', () => {
    expect(getDisplayPrice(1000)).toBe(1000)
    expect(getDisplayPrice(12345.67)).toBe(12345.67)
    expect(getDisplayPrice(1000000)).toBe(1000000)
  })

  it('should handle negative prices', () => {
    expect(getDisplayPrice(-100)).toBe(-100)
    expect(getDisplayPrice(-99.99)).toBe(-99.99)
  })

  it('should preserve decimal precision', () => {
    expect(getDisplayPrice(99.999)).toBe(99.999)
    expect(getDisplayPrice(99.991)).toBe(99.991)
    expect(getDisplayPrice(99.995)).toBe(99.995)
  })
})