import { describe, it, expect } from 'vitest'
import { matchImportance, sortByImportance } from '@/lib/importance'

describe('matchImportance tiering', () => {
  it('ranks ICC showpiece events above everything else', () => {
    expect(matchImportance({ seriesName: 'Asia Cup Rising Stars (50 Overs)', format: 'List A' })).toBe(90)
    expect(matchImportance({ seriesName: 'ICC Champions Trophy 2029', format: 'ODI' })).toBe(90)
    expect(matchImportance({ seriesName: 'World Cup 2027', format: 'ODI' })).toBe(90)
  })

  it('ranks marquee leagues second', () => {
    expect(matchImportance({ seriesName: 'International League T20', format: 'Twenty20' })).toBe(75)
    expect(matchImportance({ seriesName: 'Indian Premier League', format: 'Twenty20' })).toBe(75)
    expect(matchImportance({ seriesName: 'Big Bash League', format: 'Twenty20' })).toBe(75)
  })

  it('ranks senior international tours above age-group and domestic', () => {
    expect(matchImportance({ seriesName: 'England tour of Pakistan', format: 'Test' })).toBe(60)
  })

  it('separates age-group international cricket from senior cricket', () => {
    expect(matchImportance({ seriesName: 'England Women Under-19s tour of India 2026/27', format: 'Other OD' })).toBe(40)
  })

  it('ranks Quaid-e-Azam Trophy as a marquee domestic championship', () => {
    expect(matchImportance({ seriesName: 'QUAID-E-AZAM TROPHY GOLD 2026/27', format: 'First-class' })).toBe(30)
  })

  it('ranks domestic first-class below age-group internationals', () => {
    expect(matchImportance({ seriesName: 'CSA 4-Day Series Division 1', format: 'First-class' })).toBe(18)
  })

  it('ranks unknown T20 leagues above known domestic FC buckets by default', () => {
    expect(matchImportance({ seriesName: 'Namibia T20 Cup', format: 'Twenty20' })).toBe(25)
  })

  it('ranks List A and Other OD below first-class', () => {
    expect(matchImportance({ seriesName: 'Provincial One-Day Cup', format: 'List A' })).toBe(12)
    expect(matchImportance({ seriesName: 'Something', format: 'Other OD' })).toBe(8)
  })

  it('never throws on empty input and returns the floor tier', () => {
    expect(matchImportance({ seriesName: '', format: '' })).toBe(5)
  })
})

describe('sortByImportance', () => {
  const feed = [
    { seriesName: 'CSA 4-Day Series Division 1', format: 'First-class', id: 'csa' },
    { seriesName: 'International League T20', format: 'Twenty20', id: 'ilt20' },
    { seriesName: 'England Women Under-19s tour of India 2026/27', format: 'Other OD', id: 'u19' },
    { seriesName: 'Asia Cup Rising Stars (50 Overs)', format: 'List A', id: 'asia' },
  ]

  it('orders by tier, most important first', () => {
    const sorted = sortByImportance(feed)
    expect(sorted.map((m) => m.id)).toEqual(['asia', 'ilt20', 'u19', 'csa'])
  })

  it('is stable within a tier (feed order preserved)', () => {
    const sameTier = [
      { seriesName: 'International League T20', format: 'Twenty20', id: 'a' },
      { seriesName: 'Big Bash League', format: 'Twenty20', id: 'b' },
      { seriesName: 'SA20', format: 'Twenty20', id: 'c' },
    ]
    expect(sortByImportance(sameTier).map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the input array', () => {
    const input = [...feed]
    sortByImportance(input)
    expect(input).toEqual(feed)
  })
})
