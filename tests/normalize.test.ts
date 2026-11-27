import { describe, it, expect } from 'vitest'
import {
  normalizeListPayload,
  normalizeScorecard,
  normalizeCommentary,
  normalizeStandings,
  normalizeSearch,
  normalizeMatchDetail,
  clampCommentaryPage,
  latestCommentaryPage,
  dedupeCommentary,
  parseEpochMs,
} from '@/lib/api/normalize'

const espnListPayload = {
  success: true,
  result: {
    found: true,
    count: 2,
    matches: [
      {
        matchId: '1546783',
        teams: 'Mumbai vs Uttarakhand',
        team1: { id: '3609', name: 'Mumbai', short: 'MUM', imageUrl: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/cricket/500/3609.png' },
        team2: { id: '773', name: 'Uttarakhand', short: 'UTK', imageUrl: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/cricket/500/773.png' },
        scores: [
          { inningsId: 1, team: 'Mumbai', score: '209/10', overs: '20' },
          { inningsId: 2, team: 'Uttarakhand', score: '123/10', overs: '16.5' },
        ],
        category: 'recent',
        live: false,
        status: 'Mumbai won by 86 runs',
        state: 'post',
        stateTitle: 'Full Time',
        series: 'Syed Mushtaq Ali Trophy',
        seriesId: '8661',
        format: 'T20',
        venue: { ground: 'Some Ground', city: 'Mumbai', country: 'India' },
        startDate: 1795555200000,
        endDate: null,
        source: 'espn-site',
        detail: '/espn/match/1546783?league=8661&date=20261126',
        scorecard: '/espn/match/1546783/scorecard?league=8661&date=20261126',
        commentary: '/espn/match/1546783/commentary?league=8661&page=1',
        squads: '/espn/match/1546783/squads?league=8661',
      },
      {
        matchId: 'crex123',
        teams: 'Hyderabad vs Lahore',
        team1: { id: '1', name: 'Hyderabad', short: 'HYD' },
        team2: { id: '2', name: 'Lahore', short: 'LHR' },
        scores: [],
        category: 'upcoming',
        live: false,
        status: '',
        state: 'pre',
        stateTitle: '',
        series: 'Regional Cup',
        seriesId: '999',
        format: '',
        venue: { ground: '', city: '', country: '' },
        startDate: null,
        endDate: null,
        source: 'crex',
        detail: 'https://crex.live/cricket-match/abc',
        startTimeText: 'Today, 19:00',
      },
    ],
  },
  meta: { primary: { source: 'live', upstream: 'espn', fetchedAt: '2026-11-26T08:00:00Z', cached: false } },
}

describe('list normalization', () => {
  it('normalizes the ESPN-fallback feed end to end', () => {
    const out = normalizeListPayload(espnListPayload, 'recent')
    expect(out.matches).toHaveLength(2)
    expect(out.matches[0]!.provider).toBe('espn')
    expect(out.matches[0]!.key).toBe('espn:1546783')
    expect(out.matches[0]!.scores[0]).toMatchObject({ team: 'Mumbai', score: '209/10', overs: '20' })
    expect(out.matches[0]!.badge).toBe('result')
    expect(out.provenance).toMatchObject({ upstream: 'espn', fetchedAt: '2026-11-26T08:00:00Z', cached: false })
  })

  it('keeps CREX entries, namespaces them, and never invents a date', () => {
    const out = normalizeListPayload(espnListPayload)
    const crex = out.matches[1]!
    expect(crex.provider).toBe('crex')
    expect(crex.key).toBe('crex:crex123')
    expect(crex.startDateMs).toBeNull()
    expect(crex.startTimeText).toBe('Today, 19:00')
  })

  it('treats an empty match array as a valid result, not an error', () => {
    const out = normalizeListPayload({ success: true, result: { found: false, count: 0, matches: [] } }, 'live')
    expect(out.matches).toEqual([])
    expect(out.count).toBe(0)
  })

  it('handles a missing scores array without crashing', () => {
    const payload = { success: true, result: { matches: [{ matchId: '1', teams: 'A vs B', category: 'recent', source: 'espn-site' }] } }
    const out = normalizeListPayload(payload)
    expect(out.matches[0]!.scores).toEqual([])
  })

  it('rejects HTML/garbage payloads instead of rendering them', () => {
    expect(() => normalizeListPayload('<html><body>502 Bad Gateway</body></html>')).toThrow()
    expect(() => normalizeListPayload({ success: false, error: 'boom' })).toThrow()
  })

  it('never produces Invalid Date / 1970 from junk timestamps', () => {
    expect(parseEpochMs('not a date')).toBeNull()
    expect(parseEpochMs(undefined)).toBeNull()
    expect(parseEpochMs(1)).toBeNull()
    expect(parseEpochMs(1795555200)).toBe(1795555200000) // seconds tolerated
    expect(parseEpochMs(null)).toBeNull()
  })
})

describe('scorecard normalization', () => {
  const batsman = (id: string, position: number, runs: number) => ({ id, position, name: `P${id}`, runs, balls: runs * 2, fours: 1, sixes: 0, strikeRate: 100, dismissal: 'run out', isBatting: false })
  const twoInnings = {
    success: true,
    result: {
      matchId: 'm1',
      coverage: 'full',
      innings: [
        { inningsId: 1, team: 'A', score: '209/10', overs: '20', batsmen: [batsman('a1', 2, 20), batsman('a2', 1, 10)], bowlers: [{ id: 'b1', name: 'Bowler', overs: '4', maidens: 0, runs: 30, wickets: 2, economy: 7.5, wides: 1, noBalls: 0 }] },
        { inningsId: 2, team: 'B', score: '123/10', overs: '16.5', batsmen: [], bowlers: [] },
      ],
    },
  }

  it('sorts batting by position and preserves real zeroes', () => {
    const innings0 = {
      inningsId: 1, team: 'A', score: '209/10', overs: '20',
      batsmen: [{ ...batsman('a1', 1, 0), fours: 0, sixes: 0, balls: 0 }, batsman('a2', 2, 10)],
      bowlers: [{ id: 'b1', name: 'Bowler', overs: '4', maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 }],
    }
    const view = normalizeScorecard({ success: true, result: { matchId: 'm1', coverage: 'full', innings: [innings0] } })
    expect(view.innings[0]!.batsmen.map((b) => b.position)).toEqual([1, 2])
    expect(view.innings[0]!.batsmen[0]!.runs).toBe(0)
    expect(view.innings[0]!.bowlers[0]!.wickets).toBe(0)
    expect(view.innings[0]!.bowlers[0]!.economy).toBe(0)
  })

  it('supports Test matches with four innings', () => {
    const four = {
      success: true,
      result: {
        matchId: 'test-1',
        coverage: 'full',
        innings: [1, 2, 3, 4].map((n) => ({ inningsId: n, team: n % 2 ? 'A' : 'B', score: `${100 + n}/${n}`, overs: '40', declare: false, batsmen: [], bowlers: [] })),
      },
    }
    const view = normalizeScorecard(four)
    expect(view.innings.map((i) => i.inningsId)).toEqual([1, 2, 3, 4])
    expect(view.coverageLevel).toBe('totals-only') // claims full coverage but no tables arrived — never upgraded to 'full'
  })

  it('flags totals-only coverage instead of faking tables', () => {
    const totalsOnly = { success: true, result: { matchId: 'm', innings: [{ inningsId: 1, team: 'A', score: '250/7', overs: '50' }] } }
    const view = normalizeScorecard(totalsOnly)
    expect(view.coverageLevel).toBe('totals-only')
    expect(view.innings[0]!.batsmen).toEqual([])
  })

  it('rejects malformed scorecard payloads', () => {
    expect(() => normalizeScorecard({ hello: 'world' })).toThrow()
  })
})

describe('commentary normalization & pagination', () => {
  const payload = (page: number, pageCount: number, items: unknown[]) => ({
    success: true,
    result: { matchId: 'm1', page, pageSize: 2, pageCount, total: items.length, commentary: items },
  })

  it('starts at page 1 and never yields page 0', () => {
    expect(clampCommentaryPage(0, 5)).toBe(1)
    expect(clampCommentaryPage(-3, 5)).toBe(1)
    expect(clampCommentaryPage(Number.NaN, 5)).toBe(1)
    expect(latestCommentaryPage(0)).toBe(1)
    expect(latestCommentaryPage(7)).toBe(7)
    expect(clampCommentaryPage(99, 7)).toBe(7)
  })

  it('classifies events and keeps cumulative scores as text', () => {
    const view = normalizeCommentary(payload(2, 4, [
      { id: 'p1', inningsId: 1, over: 19, ball: 5, event: 'wicket', text: 'Bowled him!', runs: 0, wicket: true, score: '209/10', batsman: 'A', bowler: 'B' },
      { id: 'p2', inningsId: 1, over: 19, ball: 4, event: 'six', text: 'Into the stands', runs: 6, score: '203/9', batsman: 'A', bowler: 'B' },
    ]))
    expect(view.page).toBe(2)
    expect(view.items[0]!.event).toBe('wicket')
    expect(view.items[0]!.cumulativeScore).toBe('209/10')
    expect(view.items[1]!.event).toBe('six')
  })

  it('float-notation overs collapse to "over.ball" once (regression: 41.1 + ball 1 must not become 41.1.1)', () => {
    const items = normalizeCommentary(payload(1, 1, [
      { id: 'a', inningsId: 1, over: 41.1, ball: 1, event: 'run', text: 'scored', runs: 1 },
      { id: 'b', inningsId: 1, over: 42.6, ball: 6, event: 'no run', text: 'blocked', runs: 0 },
      { id: 'c', inningsId: 1, over: 43.1, ball: 1, event: 'four', text: 'boundary', runs: 4 },
    ])).items
    expect(items.map((i) => i.overLabel)).toEqual(['41.1', '42.6', '43.1'])
  })

  it('dedupes by play id and preserves order', () => {
    const items = normalizeCommentary(payload(1, 1, [
      { id: 'x', inningsId: 1, over: 1, ball: 1, text: 'one' },
      { id: 'x', inningsId: 1, over: 1, ball: 1, text: 'one (dup)' },
      { id: 'y', inningsId: 1, over: 1, ball: 2, text: 'two' },
    ])).items
    expect(dedupeCommentary(items).map((i) => i.key)).toEqual(['x', 'y'])
  })
})

describe('standings normalization', () => {
  it('renders missing NRR and empty groups honestly', () => {
    const view = normalizeStandings({ success: true, result: { leagueId: '20921', season: '2026', groups: [] } })
    expect(view.groups).toEqual([])
    expect(view.leagueId).toBe('20921')
  })

  it('maps known stats by case-insensitive key and keeps extras', () => {
    const view = normalizeStandings({
      success: true,
      result: {
        leagueId: '8661',
        season: 2026,
        groups: [{ name: 'North', entries: [{ team: { id: '1', name: 'Alpha', short: 'ALP' }, stats: { rank: 1, MatchesPlayed: '6', matchesWon: 4, netrr: '+1.5', form: 'WWL', matchPoints: 8 } }] }],
      },
    })
    const entry = view.groups[0]!.entries[0]!
    expect(entry.known.rank).toBe(1)
    expect(entry.known.matchesPlayed).toBe(6)
    expect(entry.known.matchesWon).toBe(4)
    expect(entry.known.netrr).toBe('+1.5')
    expect(entry.extra).toEqual({ form: 'WWL' })
  })

  it('keeps provider rank order — no invented sorting', () => {
    const view = normalizeStandings({
      success: true,
      result: { leagueId: '1', groups: [{ name: 'G', entries: [
        { team: { id: 'a', name: 'A', short: 'A' }, stats: { rank: 3 } },
        { team: { id: 'b', name: 'B', short: 'B' }, stats: { rank: 1 } },
      ] }] },
    })
    expect(view.groups[0]!.entries.map((e) => e.team?.id)).toEqual(['a', 'b'])
  })
})

describe('search normalization (reduced shape)', () => {
  it('survives rows without team refs, flags or scores', () => {
    const hits = normalizeSearch({ success: true, result: { matches: [{ matchId: '77', teams: 'A vs B', status: 'Live', live: true, detail: '/espn/match/77?league=1&date=20261126', series: 'Cup' }] } })
    expect(hits).toHaveLength(1)
    expect(hits[0]!).toMatchObject({ matchId: '77', teams: 'A vs B', live: true, provider: 'espn' })
    expect(hits[0]!.detailProxyUrl).toBe('/api/cricket/espn/match/77?league=1&date=20261126')
  })
})

const matchViewForTest1546786 = {
  key: 'espn:1546786', provider: 'espn' as const, matchId: '1546786', teams: 'GUJ vs GOA',
  team1: null, team2: null, scores: [], category: '', live: false,
  status: '', state: '', stateTitle: '', seriesName: '', seriesId: '8661', format: '',
  venueGround: '', venueCity: '', venueCountry: '', startDateMs: null, endDateMs: null,
  startTimeText: null, source: 'espn-site', badge: 'unknown' as const, badgeLabel: 'Status unknown',
  links: { detail: '/espn/match/1546786?league=8661&date=20261126', scorecard: null, commentary: null, squads: null, upstream: null },
  playerOfTheMatch: [],
}

describe('badge derivation (regressions)', () => {
  it('never badges a not-yet-started match LIVE, even when the feed flags it in', () => {
    const out = normalizeListPayload({
      success: true,
      result: { found: true, count: 1, matches: [{ matchId: 'm-start', teams: 'A vs B', category: 'live', live: true, status: 'Starts at 10:00 local time', state: 'in', stateTitle: 'Live', series: 'S', seriesId: '9', format: 'First-class', source: 'espn-site', detail: '/espn/match/m-start?league=9&date=20261126', scores: [] }] },
    }, 'live')
    expect(out.matches[0]!.badge).toBe('upcoming')
    expect(out.matches[0]!.badgeLabel).toBe('Upcoming')
  })

  it('detail payload overrides a falsey list seed and keeps a live match LIVE', () => {
    const detail = normalizeMatchDetail({
      success: true,
      result: { match: { matchId: '1546786', series: { id: '8661', name: 'Syed Mushtaq Ali Trophy' }, scores: [{ inningsId: 1, team: 'GUJ', score: '194/5', overs: '20' }], venue: { ground: 'Eden Gardens, Kolkata', city: 'Kolkata', country: 'India' }, category: 'live', live: true, state: 'in', status: 'Gujarat won toss & batted', stateTitle: 'Innings break' } },
    }, matchViewForTest1546786)
    expect(detail).not.toBeNull()
    expect(detail!.live).toBe(true)
    expect(detail!.badge).toBe('live')
  })

  it('toss-win status alone does not read as a result', () => {
    const detail = normalizeMatchDetail({
      success: true,
      result: { match: { matchId: 'x1', scores: [], status: 'Assam won toss & fielded', state: 'in', stateTitle: 'Innings break' } },
    })
    expect(detail!.badge).not.toBe('result')
  })

  it('genuine results still badge as result', () => {
    const detail = normalizeMatchDetail({
      success: true,
      result: { match: { matchId: 'x2', scores: [], status: 'Jharkhand won by 7 wkts (3b rem)', state: 'post', stateTitle: 'Result' } },
    })
    expect(detail!.badge).toBe('result')
  })
})

describe('match detail normalization', () => {
  it('handles detail-shaped series object and prefers fresher detail scores', () => {
    const listFallback = {
      success: true,
      result: { matches: [{ matchId: '1546783', teams: 'Mumbai vs Uttarakhand', category: 'recent', source: 'espn-site', scores: [{ inningsId: 1, team: 'Mumbai', score: '180/8', overs: '20' }], detail: '/espn/match/1546783?league=8661&date=20261126', format: 'T20', seriesId: '8661', series: 'Syed Mushtaq Ali Trophy' }] },
    }
    const fallback = normalizeListPayload(listFallback).matches[0]!
    const detail = normalizeMatchDetail({
      success: true,
      result: { match: { matchId: '1546783', series: { id: '8661', name: 'Syed Mushtaq Ali Trophy' }, scores: [{ inningsId: 1, team: 'Mumbai', score: '209/10', overs: '20' }], playerOfTheMatch: ['Musheer Khan'], venue: { ground: 'G', city: 'C', country: 'India' }, status: 'Mumbai won by 86 runs' } },
    }, fallback)
    expect(detail!.seriesName).toBe('Syed Mushtaq Ali Trophy')
    expect(detail!.seriesId).toBe('8661')
    expect(detail!.format).toBe('T20') // preserved from list — detail omits it
    expect(detail!.scores[0]!.score).toBe('209/10') // detail (fresher) wins
    expect(detail!.playerOfTheMatch).toEqual(['Musheer Khan'])
  })

  it('falls back to list data when detail fails', () => {
    const fallback = normalizeListPayload({ success: true, result: { matches: [{ matchId: '1', teams: 'A vs B', category: 'live', source: 'espn-site', detail: '/espn/match/1?league=1&date=20261126' }] } }).matches[0]!
    const detail = normalizeMatchDetail({ success: false }, fallback)
    expect(detail).toBe(fallback)
  })
})
