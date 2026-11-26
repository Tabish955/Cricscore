import { describe, it, expect } from 'vitest'
import {
  normalizeListPayload,
  normalizeMatchDetail,
  normalizeScorecard,
  normalizeCommentary,
  normalizeSquads,
  normalizeStandings,
  normalizeSeriesMatches,
  normalizeSearch,
  type MatchView,
} from '@/lib/api/normalize'
import {
  SAMPLE_LEAGUE,
  sampleListItems,
  sampleDetailByMatch,
  sampleScorecardByMatch,
  sampleCommentaryByMatch,
  sampleSquadsByMatch,
  sampleStandings,
  sampleSeriesMatches,
  sampleSearchHits,
  sampleEnvelope,
} from '@/lib/sample/data'

/**
 * The sample dataset is walked through the SAME zod schemas + normalizers as
 * the live API. If the API contract drifts, these tests fail instead of
 * Sample Mode silently rendering garbage on presentation day.
 */

function links(id: string, league = SAMPLE_LEAGUE) {
  return {
    detail: `/espn/match/${id}?league=${league}&date=20261126`,
    scorecard: `/espn/match/${id}/scorecard?league=${league}&date=20261126`,
    commentary: `/espn/match/${id}/commentary?league=${league}&page=1`,
    squads: `/espn/match/${id}/squads?league=${league}`,
    upstream: null as string | null,
  }
}

const matchViewFor = (id: string): MatchView => ({
  key: `espn:${id}`, provider: 'espn', matchId: id, teams: 'A vs B',
  team1: null, team2: null, scores: [], category: 'live', live: true,
  status: '', state: '', stateTitle: '', seriesName: '', seriesId: SAMPLE_LEAGUE, format: 'T20',
  venueGround: '', venueCity: '', venueCountry: '', startDateMs: null, endDateMs: null,
  startTimeText: null, source: 'espn-site', badge: 'live', badgeLabel: 'Live',
  links: links(id), playerOfTheMatch: [],
})

describe('sample dataset satisfies the real contract', () => {
  it('lists normalize for every feed and stay namespaced to the sample league', () => {
    for (const kind of ['live', 'recent', 'upcoming'] as const) {
      const out = normalizeListPayload(sampleEnvelope(sampleListItems[kind], true), kind)
      expect(out.matches.length).toBeGreaterThan(0)
      expect(out.provenance.upstream).toBe('sample')
      for (const m of out.matches) {
        expect(m.key.startsWith('espn:')).toBe(true)
        expect(m.seriesId).toBe(SAMPLE_LEAGUE)
      }
    }
  })

  it('list detail fallback builds a detail view for upcoming matches with no recorded detail', () => {
    const upcoming = normalizeListPayload(sampleEnvelope(sampleListItems.upcoming, true), 'upcoming').matches[0]!
    const detail = normalizeMatchDetail({ success: true, result: { match: sampleListItems.upcoming[0] }, meta: {} }, upcoming)
    expect(detail?.matchId).toBe('9000000003')
  })

  it('recorded details normalize for the sample matches', () => {
    for (const [id, json] of Object.entries(sampleDetailByMatch)) {
      const detail = normalizeMatchDetail(json, matchViewFor(id))
      expect(detail, id).not.toBeNull()
      expect(detail?.matchId).toBe(id)
    }
  })

  it('recorded scorecards normalize with real-zero-safe innings', () => {
    for (const [id, json] of Object.entries(sampleScorecardByMatch)) {
      const sc = normalizeScorecard(json)
      expect(sc.innings.length, id).toBeGreaterThanOrEqual(2)
      for (const inn of sc.innings) expect(inn.batsmen.length, id).toBeGreaterThan(0)
    }
  })

  it('recorded commentary normalizes and never yields page 0', () => {
    for (const [id, json] of Object.entries(sampleCommentaryByMatch)) {
      const page = normalizeCommentary(json)
      expect(page.page, id).toBeGreaterThanOrEqual(1)
      expect(page.items.length, id).toBeGreaterThan(0)
    }
  })

  it('recorded squads normalize into two teams', () => {
    for (const [id, json] of Object.entries(sampleSquadsByMatch)) {
      const squads = normalizeSquads(json)
      expect(squads.teams.length, id).toBe(2)
      expect(squads.teams.every((t) => t.players.length > 0), id).toBe(true)
    }
  })

  it('standings normalize and keep provider-supplied rank fields', () => {
    const table = normalizeStandings(sampleStandings)
    expect(table.groups.length).toBe(1)
    expect(table.groups[0]?.entries.length).toBe(4)
    expect(table.groups[0]?.entries[0]?.known.netrr).toBe('+1.24')
    expect(table.groups[0]?.entries[0]?.known.matchPoints).toBe(10)
  })

  it('series matches normalize to the sample league', () => {
    const series = normalizeSeriesMatches(sampleSeriesMatches(), SAMPLE_LEAGUE, '20261126')
    expect(series.matches.length).toBe(1)
    expect(series.matches[0]?.seriesId).toBe(SAMPLE_LEAGUE)
  })

  it('search hits normalize and stay fictional', () => {
    const hits = normalizeSearch(sampleSearchHits('harbour'))
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => h.key.startsWith('espn:9000') || h.provider === 'espn')).toBe(true)
  })
})
