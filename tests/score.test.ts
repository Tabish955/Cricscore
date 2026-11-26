import { describe, expect, it } from 'vitest'
import { parseScoreText, splitScoreForDisplay } from '@/lib/score'

describe('parseScoreText', () => {
  it('parses a plain score with wickets', () => {
    expect(parseScoreText('207/4')).toEqual({ runs: 207, wickets: 4 })
  })
  it('parses a bare runs figure', () => {
    expect(parseScoreText('198')).toEqual({ runs: 198, wickets: 0 })
  })
  it('parses the leading figure when chase context is embedded', () => {
    expect(parseScoreText('265/1 (35.1/50 ov, target 318)')).toEqual({ runs: 265, wickets: 1 })
    expect(parseScoreText('90/3 (36 ov, target 199)')).toEqual({ runs: 90, wickets: 3 })
    expect(parseScoreText('28/1 (2.6/20 ov, target 208)')).toEqual({ runs: 28, wickets: 1 })
  })
  it('parses slow over formats with spaces around the slash', () => {
    expect(parseScoreText('134 / 2')).toEqual({ runs: 134, wickets: 2 })
  })
  it('returns null for non-numeric scores', () => {
    expect(parseScoreText('Yet to bat')).toBeNull()
    expect(parseScoreText('')).toBeNull()
  })
})

describe('splitScoreForDisplay', () => {
  it('splits embedded chase context out of the figure', () => {
    expect(splitScoreForDisplay('265/1 (35.1/50 ov, target 318)')).toEqual({ main: '265/1', sub: '(35.1/50 ov, target 318)' })
    expect(splitScoreForDisplay('90/3 (36 ov, target 199)')).toEqual({ main: '90/3', sub: '(36 ov, target 199)' })
  })
  it('keeps a clean score whole', () => {
    expect(splitScoreForDisplay('207/4')).toEqual({ main: '207/4', sub: '' })
    expect(splitScoreForDisplay('359/3 (95 ov)')).toEqual({ main: '359/3', sub: '(95 ov)' })
  })
  it('normalises whitespace inside the figure', () => {
    expect(splitScoreForDisplay('134 / 2 (30 ov)')).toEqual({ main: '134/2', sub: '(30 ov)' })
  })
  it('passes through unparseable strings without inventing a split', () => {
    expect(splitScoreForDisplay('Yet to bat')).toEqual({ main: 'Yet to bat', sub: '' })
  })
})
