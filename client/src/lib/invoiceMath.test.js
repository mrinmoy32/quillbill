import { describe, expect, it } from 'vitest'
import { calculateTotals } from './invoiceMath.js'

// These mirror server/tests/test_calculations.py so both sides agree.
describe('calculateTotals', () => {
  it('simple GST invoice', () => {
    const t = calculateTotals([{ quantity: 2, unitPriceMinor: 500000, taxPercent: 18 }])
    expect([t.subtotal, t.tax, t.total]).toEqual([1_000_000, 180_000, 1_180_000])
  })
  it('discount reduces tax too', () => {
    const t = calculateTotals([{ quantity: 1, unitPriceMinor: 1_000_000, taxPercent: 18 }], 100_000)
    expect([t.discount, t.tax, t.total]).toEqual([100_000, 162_000, 1_062_000])
  })
  it('discount cannot exceed subtotal', () => {
    const t = calculateTotals([{ quantity: 1, unitPriceMinor: 10_000, taxPercent: 18 }], 999_999)
    expect([t.discount, t.total]).toEqual([10_000, 0])
  })
  it('rounds half up', () => {
    expect(calculateTotals([{ quantity: 1, unitPriceMinor: 5, taxPercent: 10 }]).tax).toBe(1)
  })
})
