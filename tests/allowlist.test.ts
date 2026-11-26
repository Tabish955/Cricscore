import { describe, it, expect } from 'vitest'
import { checkUpstreamPath, toProxyUrl, isSafeExternalHref, providerFromLinkOrSource, parseEspnLinkParams, PRODUCTION_API_ORIGIN } from '@/lib/api/allowlist'
import { matchHref } from '@/lib/format'
import type { MatchView } from '@/lib/api/normalize'

describe('proxy allowlist', () => {
  it('accepts the documented ESPN detail family with league+date', () => {
    const r = checkUpstreamPath('/espn/match/1546783/scorecard', '?league=8661&date=20261126')
    expect(r).toMatchObject({ ok: true, path: 'espn/match/1546783/scorecard', query: 'league=8661&date=20261126' })
  })

  it('rejects arbitrary hosts, paths and traversal', () => {
    for (const [path, query] of [
      ['/cb/live', '?redirect=https://evil.example.com'],
      ['/espn/match/99999999999', '?league=1&admin=true'],
      ['/../admin', ''],
      ['/espn/%2e%2e/health', ''],
      ['/cb/../cb/live', ''],
      ['/sources/status/extra', ''],
      ['/espn/match/1;DROP', '?league=1'],
    ] as Array<[string, string]>) {
      expect(checkUpstreamPath(path, query).ok, `${path}${query}`).toBe(false)
    }
  })

  it('rejects unsupported query keys and bad value shapes', () => {
    expect(checkUpstreamPath('/cb/search', '?q=india&token=abc').ok).toBe(false)
    expect(checkUpstreamPath('/cb/search', '?q=').ok).toBe(false) // empty q
    expect(checkUpstreamPath('/espn/standings/5', '?league=abc').ok).toBe(false) // value fails the digits validator
    expect(checkUpstreamPath('/espn/standings/5', '').ok).toBe(true) // bare path, no query needed
  })

  it('validates query values when present', () => {
    expect(checkUpstreamPath('/espn/series/8661/matches', '?date=20261399').ok).toBe(true) // shape ok (8 digits), not a calendar check
    expect(checkUpstreamPath('/espn/series/8661/matches', '?date=2026').ok).toBe(false)
    expect(checkUpstreamPath('/espn/match/1/commentary', '?league=8661&page=0').ok).toBe(true) // shape ok; page clamp lives in commentary logic
    expect(checkUpstreamPath('/espn/match/1/commentary', '?league=8661&page=1000').ok).toBe(false)
  })

  it('normalizes away leading/trailing slashes', () => {
    const r = checkUpstreamPath('//cb/live//', '')
    expect(r).toMatchObject({ ok: true, path: 'cb/live' })
  })
})

describe('toProxyUrl', () => {
  it('rewrites production-origin links to same-origin proxy calls preserving query', () => {
    expect(toProxyUrl(`${PRODUCTION_API_ORIGIN}/espn/match/1546783?league=8661&date=20261126`)).toBe('/api/cricket/espn/match/1546783?league=8661&date=20261126')
    expect(toProxyUrl('/espn/match/1546783/commentary?league=8661&page=2')).toBe('/api/cricket/espn/match/1546783/commentary?league=8661&page=2')
  })

  it('refuses foreign origins and unknown paths', () => {
    expect(toProxyUrl('https://evil.example.com/espn/match/1?league=1')).toBeNull()
    expect(toProxyUrl('javascript:alert(1)')).toBeNull()
    expect(toProxyUrl('/cb/match/123')).toBeNull() // known-failing legacy route stays out
    expect(toProxyUrl(`${PRODUCTION_API_ORIGIN}/admin/panel`)).toBeNull()
  })
})

describe('isSafeExternalHref', () => {
  it('allows only http(s)', () => {
    expect(isSafeExternalHref('https://crex.live/match/abc')).toBe(true)
    expect(isSafeExternalHref('http://example.com')).toBe(true)
    expect(isSafeExternalHref('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalHref('data:text/html,<script>1</script>')).toBe(false)
    expect(isSafeExternalHref('not a url')).toBe(false)
  })
})

describe('providerFromLinkOrSource', () => {
  it('prefers the link, falls back to source, never the bare id', () => {
    expect(providerFromLinkOrSource('/espn/match/1?league=2', null)).toBe('espn')
    expect(providerFromLinkOrSource(null, 'espn-site')).toBe('espn')
    expect(providerFromLinkOrSource('https://crex.live/x', 'crex')).toBe('crex')
    expect(providerFromLinkOrSource(null, 'crex')).toBe('crex')
    expect(providerFromLinkOrSource(null, null)).toBe('cb')
  })
})

describe('parseEspnLinkParams', () => {
  it('extracts league/date for provider-scoped routes', () => {
    expect(parseEspnLinkParams(`${PRODUCTION_API_ORIGIN}/espn/match/1546783?league=8661&date=20261126`)).toEqual({ league: '8661', date: '20261126' })
    expect(parseEspnLinkParams('https://evil.example.com/espn/match/1?league=8661&date=20261126')).toEqual({ league: '8661', date: '20261126' }) // origin-agnostic by design (we only read digits)
    expect(parseEspnLinkParams(null)).toEqual({ league: null, date: null })
    expect(parseEspnLinkParams('/espn/match/1?league=86x1')).toEqual({ league: null, date: null })
  })
})

describe('matchHref (direct reload keeps league/date)', () => {
  const base: MatchView = {
    key: 'espn:1546783', provider: 'espn', matchId: '1546783', teams: 'A vs B',
    team1: null, team2: null, scores: [], category: 'recent', live: false,
    status: '', state: '', stateTitle: '', seriesName: '', seriesId: '8661', format: 'T20',
    venueGround: '', venueCity: '', venueCountry: '', startDateMs: null, endDateMs: null,
    startTimeText: null, source: 'espn-site', badge: 'result', badgeLabel: 'Result',
    links: { detail: '/espn/match/1546783?league=8661&date=20261126', scorecard: null, commentary: null, squads: null, upstream: null },
    playerOfTheMatch: [],
  }

  it('embeds league and date in the route', () => {
    expect(matchHref(base)).toBe('/match/espn/1546783?league=8661&date=20261126')
  })

  it('omits junk params', () => {
    expect(matchHref({ ...base, links: { ...base.links, detail: '/espn/match/1?league=abc' } })).toBe('/match/espn/1546783')
  })

  it('works for links-less CREX matches', () => {
    expect(matchHref({ ...base, provider: 'crex', links: { detail: null, scorecard: null, commentary: null, squads: null, upstream: null } })).toBe('/match/crex/1546783')
  })
})
