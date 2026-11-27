import { describe, expect, it } from 'vitest'
import { computeRates, formatRate, oversToBalls, parseScoreContext } from '@/lib/rates'

describe('oversToBalls', () => {
  it('treats the notation part as balls, not decimal', () => {
    expect(oversToBalls('42.6')).toBe(258)
    expect(oversToBalls('19.2')).toBe(116)
    expect(oversToBalls('20.0')).toBe(120)
    expect(oversToBalls('5')).toBe(30)
  })

  it('rejects impossible notation', () => {
    expect(oversToBalls('3.7')).toBeNull()
    expect(oversToBalls('abc')).toBeNull()
    expect(oversToBalls('')).toBeNull()
  })
})

describe('computeRates', () => {
  it('computes CRR from an embedded overs context', () => {
    const r = computeRates('179/7 (42.6/50 ov)')
    expect(r.crr).toBeCloseTo(179 * 6 / 258, 5)
    expect(r.rrr).toBeNull()
  })

  it('computes RRR for a chase with embedded target and allowance', () => {
    const r = computeRates('141/6 (19.2/20 ov, target 168)')
    expect(r.crr).toBeCloseTo(141 * 6 / 116, 5)
    expect(r.rrr).toBeCloseTo((168 - 141) * 6 / (120 - 116), 5)
  })

  it('omits RRR once the chase is over', () => {
    expect(computeRates('168/3 (19.4/20 ov, target 168)').rrr).toBeNull()
  })

  it('never invents figures when overs are absent', () => {
    expect(computeRates('179/7').crr).toBeNull()
    expect(computeRates('not a score').crr).toBeNull()
  })

  it('falls back to the separate overs field when the score string has none', () => {
    const r = computeRates('179/7', '42.6')
    expect(r.crr).toBeCloseTo(179 * 6 / 258, 5)
  })
})

describe('formatRate', () => {
  it('formats finite numbers and em-dashes the rest', () => {
    expect(formatRate(4.1667)).toBe('4.17')
    expect(formatRate(null)).toBe('–')
    expect(formatRate(NaN)).toBe('–')
  })
})

describe('parseScoreContext', () => {
  it('extracts balls, allowance and target', () => {
    expect(parseScoreContext('141/6 (19.2/20 ov, target 168)')).toEqual({ balls: 116, allowanceBalls: 120, target: 168 })
    expect(parseScoreContext('271/5')).toEqual({ balls: null, allowanceBalls: null, target: null })
  })
})
