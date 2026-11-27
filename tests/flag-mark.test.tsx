import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { TeamBadge } from '@/components/TeamBadge'
import { normalizeMatch } from '@/lib/api/normalize'

describe('TeamBadge flag handling', () => {
  it('uses the feed-supplied flag as the badge when no crest exists', () => {
    const html = renderToString(createElement(TeamBadge, { assetKey: 'espn:668', name: 'Bangladesh A', short: 'BAN-A', imageUrl: null, flagUrl: 'https://flagcdn.com/w40/bd.png' }))
    expect(html).toContain('https://flagcdn.com/w40/bd.png')
    expect(html).toContain('Bangladesh A badge')
  })

  it('prefers a verified crest image over the flag', () => {
    const html = renderToString(createElement(TeamBadge, { assetKey: 'espn:6', name: 'India', short: 'IND', imageUrl: 'https://a.espncdn.com/i/teamlogos/cricket/500/6.png', flagUrl: 'https://flagcdn.com/w40/in.png' }))
    expect(html).toContain('500/6.png')
    expect(html).not.toContain('w40/in.png')
  })

  it('renders no <img> for non-https or absent flags', () => {
    expect(renderToString(createElement(TeamBadge, { assetKey: 'espn:1', name: 'Nowhere', short: 'NOW', imageUrl: null, flagUrl: null }))).not.toContain('<img')
    expect(renderToString(createElement(TeamBadge, { assetKey: 'espn:1', name: 'Nowhere', short: 'NOW', imageUrl: null, flagUrl: 'http://flagcdn.com/w40/now.png' }))).not.toContain('<img')
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
