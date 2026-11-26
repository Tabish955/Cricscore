/**
 * Experimental Sportskeeda standings source. The backend route is NOT released
 * (root index does not advertise it; direct request fails — checked 2026-11-26).
 * These tests cover the allowlist, the slug registry and the normalizer with
 * clearly labeled synthetic fixtures — they are NOT evidence the live source works.
 */
import { describe, it, expect } from 'vitest'
import { checkUpstreamPath } from '@/lib/api/allowlist'
import { normalizeSportskeedaStandings } from '@/lib/api/normalize'
import { SPORTSKEEDA_SLUG_RE, sportskeedaMappingFor, isSportskeedaPointsTablePath, VERIFIED_SPORTSKEEDA_MAPPINGS } from '@/lib/sportskeeda'

describe('allowlist — sportskeeda points-table route', () => {
  it('accepts the exact experimental path with a legal slug', () => {
    expect(checkUpstreamPath('sportskeeda/series/syed-mushtaq-ali-trophy/points-table', '').ok).toBe(true)
    expect(checkUpstreamPath('sportskeeda/series/ipl/points-table', '').ok).toBe(true)
  })

  it('rejects URLs, traversal, uppercase, overlong and embedded-slash slugs', () => {
    for (const bad of [
      'sportskeeda/series/IPL/points-table',
      'sportskeeda/series/ipl_2026/points-table',
      'sportskeeda/series/a/points-table/extra',
      'sportskeeda/series/../points-table',
      'sportskeeda/series/ipl%2f..%2f/points-table',
      'sportskeeda/series/' + 'a'.repeat(101) + '/points-table',
      'sportskeeda/series/https:%2F%2Fevil.test/points-table',
      '/sportskeeda/series/ipl/points-table?x=1', // query not allowed for this route
    ]) {
      expect(checkUpstreamPath(bad.split('?')[0]!, bad.includes('?') ? '?x=1' : '').ok, bad).toBe(false)
    }
  })

  it('slug validator and path matcher agree', () => {
    expect(SPORTSKEEDA_SLUG_RE.test('syed-mushtaq-ali-trophy')).toBe(true)
    expect(isSportskeedaPointsTablePath('sportskeeda/series/ipl/points-table')).toBe(true)
    expect(isSportskeedaPointsTablePath('sportskeeda/series/Ipl/points-table')).toBe(false)
  })
})

describe('verified mapping registry — nothing is derived, nothing is configured yet', () => {
  it('no mapping exists for any league out of the box (backend route unreleased)', () => {
    expect(VERIFIED_SPORTSKEEDA_MAPPINGS).toHaveLength(0)
    expect(sportskeedaMappingFor('8661')).toBeNull()
    expect(sportskeedaMappingFor('20921')).toBeNull()
    expect(sportskeedaMappingFor('')).toBeNull()
    expect(sportskeedaMappingFor(null)).toBeNull()
    expect(sportskeedaMappingFor('n/a')).toBeNull()
  })
})

describe('normalizeSportskeedaStandings — synthetic contract fixtures', () => {
  const baseMeta = { source: { source: 'live', upstream: 'https://example.test/sportskeeda/page', fetchedAt: '2026-11-26T00:00:00.000Z', cached: false } }
  const valid = {
    success: true,
    result: {
      provider: 'sportskeeda',
      seriesSlug: 'syed-mushtaq-ali-trophy',
      title: 'Syed Mushtaq Ali Trophy 2026',
      season: null,
      seasonVerified: false,
      warnings: ['Sportskeeda page reports a season label that conflicts with the current tournament.'],
      groups: [
        { name: 'Elite, Group A', entries: [
          { team: { id: 'bengal', name: 'Bengal', short: 'BEN', imageUrl: '' }, stats: { rank: 3, matchesPlayed: 7, matchesWon: 4, matchesLost: 3, matchPoints: 16, netrr: 1.648 } },
        ] },
        { name: 'Elite, Group B', entries: [
          { team: { id: '', name: 'Some Unknown XI', short: '', imageUrl: '' }, stats: { rank: 1 } },
        ] },
      ],
    },
    meta: baseMeta,
  }

  it('passes through with seasonVerified=false and warnings; identity gaps stay empty', () => {
    const view = normalizeSportskeedaStandings(valid)
    expect(view.provider).toBe('sportskeeda')
    expect(view.seasonVerified).toBe(false)
    expect(view.warnings).toHaveLength(1)
    expect(view.groups).toHaveLength(2)
    expect(view.groups[1]!.entries[0]!.team!.id).toBeNull()  // empty slug id -> null, never merged
    expect(view.groups[0]!.entries[0]!.team!.imageUrl).toBeNull() // empty string -> null, no fabricated logo
    expect(view.groups[0]!.entries[0]!.stats.netrr).toBe(1.648)
  })

  it('seasonVerified defaults to false unless literally true — never assumed', () => {
    const missing = { ...valid, result: { ...valid.result, seasonVerified: undefined } }
    expect(normalizeSportskeedaStandings(missing).seasonVerified).toBe(false)
    const truthy = { ...valid, result: { ...valid.result, seasonVerified: 1 } }
    expect(normalizeSportskeedaStandings(truthy as never).seasonVerified).toBe(false)
    const verified = { ...valid, result: { ...valid.result, seasonVerified: true } }
    expect(normalizeSportskeedaStandings(verified).seasonVerified).toBe(true)
  })

  it('rejects failure envelopes instead of rendering an empty table as success', () => {
    expect(() => normalizeSportskeedaStandings({ success: false, result: {} })).toThrow()
    expect(() => normalizeSportskeedaStandings('<html>404</html>')).toThrow()
    expect(() => normalizeSportskeedaStandings(null)).toThrow()
  })
})
