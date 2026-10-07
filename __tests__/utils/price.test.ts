import {
  dbToDisplay,
  displayToDb,
  toDisplayPrice,
  toCartPrice,
  kurusToTl,
  formatTRY,
} from '@/lib/price'

describe('dbToDisplay / displayToDb', () => {
  it('converts integer kuruş to and from display TL', () => {
    expect(dbToDisplay(14999)).toBe(149.99)
    expect(displayToDb(149.99)).toBe(14999)
    expect(displayToDb(175)).toBe(17500)
    expect(displayToDb(6500)).toBe(650000)
    expect(displayToDb(319.9)).toBe(31990)
    expect(displayToDb(149.99)).toBe(14999)
    expect(displayToDb(12.3456)).toBe(1235)
  })
})

describe('toDisplayPrice / toCartPrice', () => {
  it('converts cart kuruş ↔ display TL', () => {
    expect(toCartPrice(149.9)).toBe(14990)
    expect(toDisplayPrice(14990)).toBe(149.9)
  })
})

describe('kurusToTl', () => {
  it('divides by 100', () => {
    expect(kurusToTl(14999)).toBe(149.99)
    expect(kurusToTl(0)).toBe(0)
  })
})

describe('formatTRY', () => {
  it('formats with Turkish locale', () => {
    expect(formatTRY(100)).toBe('100,00')
    expect(formatTRY(99.99)).toBe('99,99')
    expect(formatTRY(1500.5)).toBe('1.500,50')
    expect(formatTRY(319.9)).toBe('319,90')
    expect(formatTRY(6500)).toBe('6.500,00')
  })

  it('handles zero and small values', () => {
    expect(formatTRY(0)).toBe('0,00')
    expect(formatTRY(0.01)).toBe('0,01')
    expect(formatTRY(0.1)).toBe('0,10')
  })

  it('handles large values and negatives', () => {
    expect(formatTRY(1000)).toBe('1.000,00')
    expect(formatTRY(12345.67)).toBe('12.345,67')
    expect(formatTRY(-100)).toBe('-100,00')
  })

  it('rounds fraction digits like toLocaleString', () => {
    expect(formatTRY(99.999)).toBe('100,00')
    expect(formatTRY(99.991)).toBe('99,99')
  })
})
