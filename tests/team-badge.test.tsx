import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { TeamBadge } from '@/components/TeamBadge'
import { normalizeTeamName, stripVariantTokens, readableOn, resolveLocalVisual } from '@/lib/team-visuals'

describe('normalizeTeamName / stripVariantTokens', () => {
  it('lowercases, strips punctuation and collapses whitespace', () => {
    expect(normalizeTeamName('Royal Challengers  Bengaluru')).toBe('royal challengers bengaluru')
    expect(normalizeTeamName('Durban’s Super Giants')).toBe('durbans super giants')
    expect(normalizeTeamName('St. Lucia Kings')).toBe('st lucia kings')
  })

  it('strips trailing variant tokens for lookup only', () => {
    expect(stripVariantTokens('mumbai indians women')).toBe('mumbai indians')
    expect(stripVariantTokens('pakistan u19')).toBe('pakistan')
    expect(stripVariantTokens('pakistan a women')).toBe('pakistan')
    expect(stripVariantTokens('islamabad united')).toBe('islamabad united')
  })
})

describe('readableOn', () => {
  it('picks high-contrast text', () => {
    expect(readableOn('#005caf')).toBe('#f5f0e4')
    expect(readableOn('#ffd400')).toBe('#101a14')
    expect(readableOn('#111111')).toBe('#f5f0e4')
  })
})

describe('resolveLocalVisual', () => {
  it('resolves the sanctioned West Indies local asset', () => {
    expect(resolveLocalVisual('West Indies')).toEqual({ kind: 'asset', src: '/flags/west-indies.png' })
    expect(resolveLocalVisual('WI')).toEqual({ kind: 'asset', src: '/flags/west-indies.png' })
    expect(resolveLocalVisual('Windies')).toEqual({ kind: 'asset', src: '/flags/west-indies.png' })
  })

  it('resolves franchise shields incl aliases and women/variants', () => {
    expect(resolveLocalVisual('Karachi Kings')).toMatchObject({ kind: 'shield', shield: { shortCode: 'KK' } })
    expect(resolveLocalVisual('Royal Challengers Bangalore')).toMatchObject({ kind: 'shield', shield: { shortCode: 'RCB' } })
    expect(resolveLocalVisual('Mumbai Indians Women')).toMatchObject({ kind: 'shield', shield: { shortCode: 'MI' } })
    expect(resolveLocalVisual('Peshawari Zalmi')).toMatchObject({ kind: 'shield', shield: { shortCode: 'PZ' } })
    expect(resolveLocalVisual('Joburg Super Kings')).toMatchObject({ kind: 'shield', shield: { shortCode: 'JSK' } })
  })

  it('returns null for unknown teams (monogram falls through)', () => {
    expect(resolveLocalVisual('Harbour City CC')).toBeNull()
    expect(resolveLocalVisual('')).toBeNull()
  })
})

describe('TeamBadge rendering', () => {
  it('renders the franchise shield when only an alias matches', () => {
    const html = renderToString(createElement(TeamBadge, { assetKey: 'cb:1', name: 'Kings XI Punjab', short: 'PBKS' }))
    expect(html).toContain('PBKS')
    expect(html).toContain('aria-hidden="true"') // decorative (spec §4): the adjacent name is the accessible label
    expect(html).toContain('<svg')
  })

  it('renders the WI asset as the badge when the feed has nothing', () => {
    const html = renderToString(createElement(TeamBadge, { assetKey: 'espn:5000', name: 'West Indies', short: 'WI' }))
    expect(html).toContain('/flags/west-indies.png')
  })

  it('prefers a feed flag over the shield/absent everything', () => {
    const html = renderToString(createElement(TeamBadge, { assetKey: 'espn:6', name: 'India', short: 'IND', flagUrl: 'https://flagcdn.com/w40/in.png' }))
    expect(html).toContain('https://flagcdn.com/w40/in.png')
  })

  it('prefers a verified crest over any flag', () => {
    const html = renderToString(createElement(TeamBadge, { assetKey: 'espn:6', name: 'India', short: 'IND', imageUrl: 'https://a.espncdn.com/i/teamlogos/cricket/500/6.png', flagUrl: 'https://flagcdn.com/w40/in.png' }))
    expect(html).toContain('500/6.png')
  })

  it('falls back to a monogram for unknown clubs with no feed data', () => {
    const html = renderToString(createElement(TeamBadge, { assetKey: 'cb:88', name: 'Harbour City CC', short: 'HAR' }))
    expect(html).not.toContain('<img')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('HAR'.slice(0, 2)) // initials, decorative
  })
})
