import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { FlagMark } from '@/components/FlagMark'
import { normalizeMatch } from '@/lib/api/normalize'

describe('FlagMark', () => {
  it('renders nothing when the feed supplies no flagUrl', () => {
    expect(renderToString(createElement(FlagMark, { flagUrl: null, name: 'Bangladesh A' }))).toBe('')
    expect(renderToString(createElement(FlagMark, { flagUrl: undefined, name: 'Dubai Capitals' }))).toBe('')
  })

  it('renders nothing for non-https URLs', () => {
    expect(renderToString(createElement(FlagMark, { flagUrl: 'http://flagcdn.com/w40/bd.png', name: 'X' }))).toBe('')
    expect(renderToString(createElement(FlagMark, { flagUrl: 'javascript:alert(1)', name: 'X' }))).toBe('')
  })

  it('renders the feed-supplied flag', () => {
    const html = renderToString(createElement(FlagMark, { flagUrl: 'https://flagcdn.com/w40/bd.png', name: 'Bangladesh A' }))
    expect(html).toContain('https://flagcdn.com/w40/bd.png')
    expect(html).toContain('Bangladesh A flag')
  })
})

describe('flagUrl normalization passthrough', () => {
  const item = (team: Record<string, unknown>) => ({
    matchId: '99', teams: 'X vs Y', state: 'in', category: 'live', live: true, status: 'live',
    team1: team, team2: { ...team }, scores: [],
    detail: 'https://cricketapi-beryl.vercel.app/espn/match/99?league=1&date=20261127', source: 'espn-site',
  })

  it('keeps a feed flagUrl end-to-end', () => {
    const view = normalizeMatch(item({ id: '668', name: 'Bangladesh A', short: 'BAN-A', imageUrl: null, flagUrl: 'https://flagcdn.com/w40/bd.png' }), 'live')!
    expect(view.team1?.flagUrl).toBe('https://flagcdn.com/w40/bd.png')
  })

  it('keeps null flags absent — never invented', () => {
    const view = normalizeMatch(item({ id: '1346027', name: 'Abu Dhabi Knight Riders', short: 'ADKR', imageUrl: null, flagUrl: null }), 'live')!
    expect(view.team1?.flagUrl).toBeNull()
  })
})
