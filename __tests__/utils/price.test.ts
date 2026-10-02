import {
  dbToDisplay,
  displayToDb,
  toDisplayPrice,
  toCartPrice,
  kurusToTl,
  formatTRY,
} from '@/lib/price'

describe('dbToDisplay / displayToDb', () => {
  it('converts DB ↔ display with the /100/10 and *1000 rules', () => {
    expect(dbToDisplay(149900)).toBe(149.9)
    expect(displayToDb(149.9)).toBe(149900)
    expect(dbToDisplay(1000)).toBe(1)
    expect(displayToDb(1)).toBe(1000)
  })

  it('rounds displayToDb', () => {
    expect(displayToDb(12.3456)).toBe(12346)
  })
})

describe('toDisplayPrice / toCartPrice', () => {
  it('converts cart 10x ↔ display', () => {
    expect(toCartPrice(149.9)).toBe(1499)
    expect(toDisplayPrice(1499)).toBe(149.9)
  })
})

describe('kurusToTl', () => {
  it('divides by 100', () => {
    expect(kurusToTl(14990)).toBe(149.9)
    expect(kurusToTl(0)).toBe(0)
  })
})

describe('formatTRY', () => {
  it('formats with Turkish locale', () => {
    expect(formatTRY(100)).toBe('100,00')
    expect(formatTRY(99.99)).toBe('99,99')
    expect(formatTRY(1500.5)).toBe('1.500,50')
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
