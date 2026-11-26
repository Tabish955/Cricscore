import { describe, it, expect } from 'vitest'
import { formatMatchDate, formatMatchTime, toApiDate, apiDateToInputValue, inputValueToApiDate, venueLine, matchHref, formatRate, formatOvers } from '@/lib/format'

describe('date/time formatting (never 1970, never Invalid Date)', () => {
  it('null timestamps render explicit placeholders', () => {
    expect(formatMatchDate(null)).toBe('Date not supplied')
    expect(formatMatchTime(null)).toBeNull()
    expect(formatMatchDate(Number.NaN)).toBe('Date not supplied')
  })

  it('valid epoch ms renders a real date', () => {
    const d = formatMatchDate(1795555200000)
    expect(d).not.toBe('Date not supplied')
    expect(d.length).toBeGreaterThan(3)
  })

  it('YYYYMMDD round-trips through the date input helpers', () => {
    expect(toApiDate(new Date(2026, 10, 26))).toBe('20261126')
    expect(apiDateToInputValue('20261126')).toBe('2026-11-26')
    expect(inputValueToApiDate('2026-11-26')).toBe('20261126')
    expect(apiDateToInputValue('garbage')).toBe('')
    expect(inputValueToApiDate('2026/11/26')).toBe(toApiDate(new Date())) // falls back to today, never crashes
  })

  it('venue line skips empties without inventing places', () => {
    expect(venueLine('Ground A', '', '')).toBe('Ground A')
    expect(venueLine('', '', '')).toBe('')
    expect(venueLine('Oval', 'London', 'England')).toBe('Oval, London, England')
    expect(venueLine('Eden Gardens, Kolkata', 'Kolkata', 'India')).toBe('Eden Gardens, Kolkata, India')
    expect(venueLine('Eden Gardens, Kolkata', 'kolKATA', 'India')).toBe('Eden Gardens, Kolkata, India')
  })

  it('rates and overs display verbatim', () => {
    expect(formatRate(141.9334, 2)).toBe('141.93')
    expect(formatRate(null)).toBe('–')
    expect(formatOvers('19.5')).toBe('19.5') // 19 overs 5 balls — displayed, never re-parsed
    expect(formatOvers(null)).toBe('–')
  })

  it('matchHref keeps league/date for ESPN reloads', () => {
    expect(matchHref({ provider: 'espn', matchId: '1546783', links: { detail: '/espn/match/1546783?league=8661&date=20261126', scorecard: null } })).toBe('/match/espn/1546783?league=8661&date=20261126')
  })
})
