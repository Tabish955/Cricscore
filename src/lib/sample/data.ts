/**
 * FICTIONAL sample dataset for Sample Mode (explicit opt-in, offline classrooms).
 * Invented teams/players/scores. league "9001" and match ids 9xxxxxxxx are
 * deliberately fake and carry no real-world identity.
 */
import type { MatchListItemRaw } from '@/lib/api/schema'

const NOW = Date.now()
const HOUR = 3_600_000
const DAY = 24 * HOUR

export const SAMPLE_LEAGUE = '9001'

const baseVenues = {
  harbor: { ground: 'Breakwater Oval', city: 'Harbour City', country: 'Elsewhere' },
  dune: { ground: 'Dune Wanderers Ground', city: 'Dunehaven', country: 'Elsewhere' },
}

export const sampleListItems: Record<'live' | 'recent' | 'upcoming', MatchListItemRaw[]> = {
  live: [
    {
      matchId: '9000000001',
      teams: 'Harbour City CC vs Dune Wanderers',
      team1: { id: '900011', name: 'Harbour City CC', short: 'HAR', imageUrl: null },
      team2: { id: '900012', name: 'Dune Wanderers', short: 'DUNE', imageUrl: null },
      scores: [{ inningsId: 1, team: 'Harbour City CC', score: '88/2', overs: '11.3' }],
      category: 'live',
      live: true,
      status: 'Harbour City CC trail by 21 runs',
      state: 'in',
      stateTitle: 'In Play',
      series: 'Sample Premier T20 (fictional)',
      seriesId: SAMPLE_LEAGUE,
      format: 'T20',
      venue: baseVenues.harbor,
      startDate: NOW - 1 * HOUR,
      endDate: NOW + 2 * HOUR,
      source: 'espn-site',
      detail: `/espn/match/9000000001?league=${SAMPLE_LEAGUE}&date=${apiDate(NOW)}`,
      scorecard: `/espn/match/9000000001/scorecard?league=${SAMPLE_LEAGUE}&date=${apiDate(NOW)}`,
      commentary: `/espn/match/9000000001/commentary?league=${SAMPLE_LEAGUE}&page=1`,
      squads: `/espn/match/9000000001/squads?league=${SAMPLE_LEAGUE}`,
    },
  ],
  recent: [
    {
      matchId: '9000000002',
      teams: 'Harbour City CC vs Valley Riders',
      team1: { id: '900011', name: 'Harbour City CC', short: 'HAR', imageUrl: null },
      team2: { id: '900013', name: 'Valley Riders', short: 'VAL', imageUrl: null },
      scores: [
        { inningsId: 1, team: 'Harbour City CC', score: '132/6', overs: '16.2' },
        { inningsId: 2, team: 'Valley Riders', score: '129/9', overs: '20' },
      ],
      category: 'recent',
      live: false,
      status: 'Harbour City CC won by 4 wickets',
      state: 'post',
      stateTitle: 'Full Time',
      series: 'Sample Premier T20 (fictional)',
      seriesId: SAMPLE_LEAGUE,
      format: 'T20',
      venue: baseVenues.harbor,
      startDate: NOW - 3 * DAY,
      endDate: NOW - 3 * DAY + 3 * HOUR,
      source: 'espn-site',
      detail: `/espn/match/9000000002?league=${SAMPLE_LEAGUE}&date=${apiDate(NOW - 3 * DAY)}`,
      scorecard: `/espn/match/9000000002/scorecard?league=${SAMPLE_LEAGUE}&date=${apiDate(NOW - 3 * DAY)}`,
      commentary: `/espn/match/9000000002/commentary?league=${SAMPLE_LEAGUE}&page=1`,
      squads: `/espn/match/9000000002/squads?league=${SAMPLE_LEAGUE}`,
    },
  ],
  upcoming: [
    {
      matchId: '9000000003',
      teams: 'Valley Riders vs Pier Point CCO',
      team1: { id: '900013', name: 'Valley Riders', short: 'VAL', imageUrl: null },
      team2: { id: '900014', name: 'Pier Point CCO', short: 'PIER', imageUrl: null },
      scores: [],
      category: 'upcoming',
      live: false,
      status: '',
      state: 'pre',
      stateTitle: 'Scheduled',
      series: 'Sample Premier T20 (fictional)',
      seriesId: SAMPLE_LEAGUE,
      format: 'T20',
      venue: { ground: 'Harbor Road Ground', city: 'Pier Point', country: 'Elsewhere' },
      startDate: NOW + 1 * DAY + 5 * HOUR,
      endDate: NOW + 1 * DAY + 9 * HOUR,
      source: 'espn-site',
    },
  ],
}

function apiDate(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

export const sampleMatchDelta = { 9000000001: 'live', 9000000002: 'recent', 9000000003: 'upcoming' } as const

export const sampleDetailByMatch: Record<string, unknown> = {
  '9000000001': {
    success: true,
    result: {
      match: {
        matchId: '9000000001',
        status: 'Harbour City CC trail by 21 runs',
        category: 'live',
        state: 'in',
        stateTitle: 'In Play',
        series: { id: SAMPLE_LEAGUE, name: 'Sample Premier T20 (fictional)' },
        format: 'T20',
        team1: { id: '900011', name: 'Harbour City CC', short: 'HAR', imageUrl: null },
        team2: { id: '900012', name: 'Dune Wanderers', short: 'DUNE', imageUrl: null },
        scores: [
          { inningsId: 1, team: 'Harbour City CC', score: '88/2', overs: '11.3' },
          { inningsId: 2, team: 'Dune Wanderers', score: '109/6', overs: '14.1' },
        ],
        venue: baseVenues.harbor,
        playerOfTheMatch: [],
        startDate: NOW - 1 * HOUR,
        detail: `/espn/match/9000000001?league=${SAMPLE_LEAGUE}&date=${apiDate(NOW)}`,
        scorecard: `/espn/match/9000000001/scorecard?league=${SAMPLE_LEAGUE}&date=${apiDate(NOW)}`,
        commentary: `/espn/match/9000000001/commentary?league=${SAMPLE_LEAGUE}&page=1`,
        squads: `/espn/match/9000000001/squads?league=${SAMPLE_LEAGUE}`,
      },
    },
    meta: { source: { upstream: 'sample', fetchedAt: new Date(NOW).toISOString(), cached: false, source: 'fixture' } },
  },
  '9000000002': {
    success: true,
    result: {
      match: {
        matchId: '9000000002',
        status: 'Harbour City CC won by 4 wickets',
        category: 'recent',
        state: 'post',
        stateTitle: 'Full Time',
        series: { id: SAMPLE_LEAGUE, name: 'Sample Premier T20 (fictional)' },
        format: 'T20',
        team1: { id: '900011', name: 'Harbour City CC', short: 'HAR', imageUrl: null },
        team2: { id: '900013', name: 'Valley Riders', short: 'VAL', imageUrl: null },
        scores: [
          { inningsId: 1, team: 'Harbour City CC', score: '132/6', overs: '16.2' },
          { inningsId: 2, team: 'Valley Riders', score: '129/9', overs: '20' },
        ],
        venue: baseVenues.harbor,
        playerOfTheMatch: ['T. Okafor'],
        startDate: NOW - 3 * DAY,
        detail: `/espn/match/9000000002?league=${SAMPLE_LEAGUE}&date=${apiDate(NOW - 3 * DAY)}`,
        scorecard: `/espn/match/9000000002/scorecard?league=${SAMPLE_LEAGUE}&date=${apiDate(NOW - 3 * DAY)}`,
        commentary: `/espn/match/9000000002/commentary?league=${SAMPLE_LEAGUE}&page=1`,
        squads: `/espn/match/9000000002/squads?league=${SAMPLE_LEAGUE}`,
      },
    },
    meta: { source: { upstream: 'sample', fetchedAt: new Date(NOW - 3 * DAY).toISOString(), cached: false, source: 'fixture' } },
  },
}

export const sampleScorecardByMatch: Record<string, unknown> = {
  '9000000002': {
    success: true,
    result: {
      matchId: '9000000002',
      coverage: 'full (sample)',
      innings: [
        {
          inningsId: 1, team: 'Harbour City CC', score: '132/6', overs: '16.2', declared: false,
          batsmen: [
            { id: 's-p1', position: 1, name: 'A. Rafiq', runs: 44, balls: 31, fours: 5, sixes: 1, strikeRate: 141.93, dismissal: 'c D. Menon b S. Whitmore', isBatting: false },
            { id: 's-p2', position: 2, name: 'T. Okafor', runs: 58, balls: 39, fours: 6, sixes: 2, strikeRate: 148.71, dismissal: 'lbw b R. Saldanha', isBatting: false },
            { id: 's-p3', position: 3, name: 'M. Ferreira', runs: 12, balls: 11, fours: 1, sixes: 0, strikeRate: 109.09, dismissal: 'c L. Brandt b S. Whitmore', isBatting: false },
            { id: 's-p4', position: 4, name: 'J. Castillo', runs: 8, balls: 9, fours: 0, sixes: 0, strikeRate: 88.88, dismissal: 'run out (D. Menon)', isBatting: false },
            { id: 's-p5', position: 5, name: 'D. Whitcombe', runs: 3, balls: 4, fours: 0, sixes: 0, strikeRate: 75, dismissal: 'not out (sample)', isBatting: true },
          ],
          bowlers: [
            { id: 's-b1', name: 'S. Whitmore', overs: '4', maidens: 0, runs: 34, wickets: 2, economy: 8.5, wides: 1, noBalls: 0 },
            { id: 's-b2', name: 'R. Saldanha', overs: '3.2', maidens: 0, runs: 29, wickets: 1, economy: 8.7, wides: 2, noBalls: 0 },
            { id: 's-b3', name: 'D. Menon', overs: '4', maidens: 0, runs: 27, wickets: 0, economy: 6.75, wides: 0, noBalls: 1 },
          ],
        },
        {
          inningsId: 2, team: 'Valley Riders', score: '129/9', overs: '20', declared: false,
          batsmen: [
            { id: 's-q1', position: 1, name: 'L. Brandt', runs: 51, balls: 44, fours: 6, sixes: 1, strikeRate: 115.9, dismissal: 'c M. Ferreira b R. Saldanha', isBatting: false },
            { id: 's-q2', position: 2, name: 'D. Menon', runs: 22, balls: 18, fours: 2, sixes: 1, strikeRate: 122.22, dismissal: 'b S. Iwu', isBatting: false },
            { id: 's-q3', position: 3, name: 'P. Nakamura', runs: 19, balls: 17, fours: 1, sixes: 1, strikeRate: 111.76, dismissal: 'c A. Rafiq b M. Ferreira', isBatting: false },
          ],
          bowlers: [
            { id: 's-c1', name: 'M. Ferreira', overs: '4', maidens: 0, runs: 28, wickets: 2, economy: 7, wides: 0, noBalls: 0 },
            { id: 's-c2', name: 'R. Saldanha', overs: '4', maidens: 0, runs: 31, wickets: 2, economy: 7.75, wides: 1, noBalls: 0 },
            { id: 's-c3', name: 'A. Rafiq', overs: '4', maidens: 0, runs: 26, wickets: 1, economy: 6.5, wides: 2, noBalls: 0 },
          ],
        },
      ],
    },
    meta: { source: { upstream: 'sample', fetchedAt: new Date(NOW - 3 * DAY).toISOString(), cached: false } },
  },
  '9000000001': {
    success: true,
    result: {
      matchId: '9000000001',
      coverage: 'full (sample)',
      innings: [
        {
          inningsId: 1, team: 'Harbour City CC', score: '88/2', overs: '11.3', declared: false,
          batsmen: [
            { id: 's-p2', position: 1, name: 'T. Okafor', runs: 41, balls: 29, fours: 4, sixes: 1, strikeRate: 141.37, dismissal: 'c D. Menon b P. Nakamura', isBatting: false },
            { id: 's-p3', position: 2, name: 'M. Ferreira', runs: 26, balls: 19, fours: 3, sixes: 0, strikeRate: 136.84, dismissal: 'c S. Whitmore b D. Menon', isBatting: false },
            { id: 's-p4', position: 3, name: 'J. Castillo', runs: 17, balls: 12, fours: 2, sixes: 0, strikeRate: 141.66, dismissal: '', isBatting: true },
            { id: 's-p5', position: 4, name: 'D. Whitcombe', runs: 1, balls: 2, fours: 0, sixes: 0, strikeRate: 50, dismissal: '', isBatting: true },
          ],
          bowlers: [
            { id: 's-d1', name: 'P. Nakamura', overs: '4', maidens: 0, runs: 33, wickets: 1, economy: 8.25, wides: 1, noBalls: 0 },
            { id: 's-d2', name: 'D. Menon', overs: '4', maidens: 0, runs: 29, wickets: 1, economy: 7.25, wides: 0, noBalls: 0 },
            { id: 's-d3', name: 'S. Whitmore', overs: '3.3', maidens: 0, runs: 26, wickets: 0, economy: 7.2, wides: 0, noBalls: 0 },
          ],
        },
        {
          inningsId: 2, team: 'Dune Wanderers', score: '109/6', overs: '14.1', declared: false,
          batsmen: [
            { id: 's-d1', position: 1, name: 'P. Nakamura', runs: 33, balls: 26, fours: 4, sixes: 0, strikeRate: 126.92, dismissal: 'c A. Rafiq b M. Ferreira', isBatting: false },
            { id: 's-d2', position: 2, name: 'D. Menon', runs: 18, balls: 15, fours: 2, sixes: 0, strikeRate: 120, dismissal: 'b S. Iwu', isBatting: false },
          ],
          bowlers: [
            { id: 's-e1', name: 'M. Ferreira', overs: '4', maidens: 0, runs: 24, wickets: 1, economy: 6, wides: 1, noBalls: 0 },
            { id: 's-e2', name: 'S. Iwu', overs: '4', maidens: 0, runs: 22, wickets: 2, economy: 5.5, wides: 0, noBalls: 0 },
          ],
        },
      ],
    },
    meta: { source: { upstream: 'sample', fetchedAt: new Date(NOW).toISOString(), cached: false } },
  },
}

export const sampleCommentaryByMatch: Record<string, unknown> = {
  '9000000001': {
    success: true,
    result: {
      page: 1, pageCount: 3, pageSize: 5, total: 14, matchId: '9000000001',
      commentary: [
      { id: 'sb-12', inningsId: 1, over: 11, ball: 3, event: 'four', text: 'Castillo drives through the covers. Timing was a fraction late but it races away.', runs: 4, batsman: 'J. Castillo', bowler: 'S. Whitmore', score: '88/2', wicket: false },
      { id: 'sb-11', inningsId: 1, over: 11, ball: 2, event: 'normal', text: 'No run. Tucked into the leg side, nowhere near the line.', runs: 0, batsman: 'J. Castillo', bowler: 'S. Whitmore', score: '84/2', wicket: false },
      { id: 'sb-10', inningsId: 1, over: 11, ball: 1, event: 'normal', text: 'Single to midwicket, Ferreira calls for the extra one.', runs: 1, batsman: 'D. Whitcombe', bowler: 'S. Whitmore', score: '84/2', wicket: false },
      { id: 'sb-09', inningsId: 1, over: 10, ball: 6, event: 'six', text: 'Ferreira goes down on one knee and launches it over long-on. That clears the rope with room.', runs: 6, batsman: 'M. Ferreira', bowler: 'P. Nakamura', score: '83/2', wicket: false },
      { id: 'sb-08', inningsId: 1, over: 10, ball: 5, event: 'wicket', text: 'Ferreira to Menon, caught on the splice at point off the shoulder of the bat. Big swing, mistimed.', runs: 0, batsman: 'M. Ferreira', bowler: 'D. Menon', score: '77/2', wicket: true },
      ],
    },
    meta: { source: { upstream: 'sample', fetchedAt: new Date(NOW).toISOString(), cached: false, source: 'sample' } },
  },
  '9000000002': {
    success: true,
    result: {
      page: 1, pageCount: 2, pageSize: 5, total: 9, matchId: '9000000002',
      commentary: [
      { id: 'wc-9', inningsId: 2, over: 19, ball: 6, event: 'wicket', text: 'R. Saldanha to Brandt, lbw reviewed and upheld. Valley Riders fall short by four wickets.', runs: 0, batsman: 'L. Brandt', bowler: 'R. Saldanha', score: '129/9', wicket: true },
      { id: 'wc-8', inningsId: 2, over: 19, ball: 4, event: 'four', text: 'Menon flat-bats over mid-off for four.', runs: 4, batsman: 'D. Menon', bowler: 'R. Saldanha', score: '125/8', wicket: false },
      { id: 'wc-7', inningsId: 2, over: 18, ball: 2, event: 'six', text: 'Six over long-on! That lands beyond the car park.', runs: 6, batsman: 'L. Brandt', bowler: 'S. Iwu', score: '121/8', wicket: false },
      ],
    },
    meta: { source: { upstream: 'sample', fetchedAt: new Date(NOW).toISOString(), cached: false, source: 'sample' } },
  },
}

export const sampleSquadsByMatch: Record<string, unknown> = {
  '9000000001': squadsShape('9000000001', [
    { id: 's-p1', name: 'A. Rafiq', role: 'Batter', isCaptain: true, isStarter: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm off-break', teamId: '900011' },
    { id: 's-p2', name: 'T. Okafor', role: 'Wicket Keeper', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: null, teamId: '900011' },
    { id: 's-p3', name: 'M. Ferreira', role: 'All Rounder', isCaptain: false, isStarter: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm medium', teamId: '900011' },
    { id: 's-p4', name: 'J. Castillo', role: 'Batter', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: null, teamId: '900011' },
    { id: 's-p5', name: 'D. Whitcombe', role: 'Batter', isCaptain: false, isStarter: true, battingStyle: 'Left-hand bat', bowlingStyle: null, teamId: '900011' },
    { id: 's-e4', name: 'S. Iwu', role: 'Bowler', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast', teamId: '900011' },
  ], [
    { id: 's-d1', name: 'P. Nakamura', role: 'Batter', isCaptain: true, isStarter: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm off-break', teamId: '900012' },
    { id: 's-d2', name: 'D. Menon', role: 'All Rounder', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm leg-break', teamId: '900012' },
    { id: 's-d3', name: 'S. Whitmore', role: 'Bowler', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast-medium', teamId: '900012' },
    { id: 's-d4', name: 'G. Almeida', role: 'Wicket Keeper', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: null, teamId: '900012' },
  ]),
  '9000000002': squadsShape('9000000002', [
    { id: 's-p1', name: 'A. Rafiq', role: 'Batter', isCaptain: true, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm off-break', teamId: '900011' },
    { id: 's-p2', name: 'T. Okafor', role: 'Wicket Keeper', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: null, teamId: '900011' },
    { id: 's-p3', name: 'M. Ferreira', role: 'All Rounder', isCaptain: false, isStarter: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm medium', teamId: '900011' },
    { id: 's-p5', name: 'D. Whitcombe', role: 'Batter', isCaptain: false, isStarter: true, battingStyle: 'Left-hand bat', bowlingStyle: null, teamId: '900011' },
  ], [
    { id: 's-q1', name: 'L. Brandt', role: 'Batter', isCaptain: true, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', teamId: '900013' },
    { id: 's-q2', name: 'D. Menon', role: 'All Rounder', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm leg-break', teamId: '900013' },
    { id: 's-q3', name: 'P. Nakamura', role: 'Batter', isCaptain: false, isStarter: true, battingStyle: 'Left-hand bat', bowlingStyle: null, teamId: '900013' },
    { id: 's-q4', name: 'S. Whitmore', role: 'Bowler', isCaptain: false, isStarter: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast-medium', teamId: '900013' },
  ]),
}

function squadsShape(matchId: string, har: Array<Record<string, unknown>>, other: Array<Record<string, unknown>>) {
  const mk = (teamId: string, teamName: string, players: Array<Record<string, unknown>>) => ({
    teamId,
    teamName,
    players: players.map(({ teamId: _drop, ...p }) => p),
  })
  return {
    success: true,
    result: {
      matchId,
      teams: [
        mk(matchId === '9000000001' ? '900011' : '900011', 'Harbour City CC', har),
        mk(matchId === '9000000001' ? '900012' : '900013', matchId === '9000000001' ? 'Dune Wanderers' : 'Valley Riders', other),
      ],
    },
    meta: { source: { upstream: 'sample', fetchedAt: new Date(NOW).toISOString(), cached: false } },
  }
}

export const sampleStandings = {
  success: true,
  result: {
    leagueId: SAMPLE_LEAGUE,
    season: '2026 (fictional)',
    groups: [
      {
        name: 'Sample Premier — Group A (fictional)',
        entries: [
          { team: { id: '900011', name: 'Harbour City CC', short: 'HAR' }, stats: { rank: 1, matchesPlayed: 6, matchesWon: 5, matchesLost: 1, matchPoints: 10, netrr: '+1.24' } },
          { team: { id: '900013', name: 'Valley Riders', short: 'VAL' }, stats: { rank: 2, matchesPlayed: 6, matchesWon: 4, matchesLost: 2, matchPoints: 8, netrr: '+0.61' } },
          { team: { id: '900014', name: 'Pier Point CCO', short: 'PIER' }, stats: { rank: 3, matchesPlayed: 6, matchesWon: 2, matchesLost: 4, matchPoints: 4, netrr: '-0.83' } },
          { team: { id: '900012', name: 'Dune Wanderers', short: 'DUNE' }, stats: { rank: 4, matchesPlayed: 6, matchesWon: 0, matchesLost: 6, matchPoints: 0, netrr: '-2.02' } },
        ],
      },
    ],
  },
  meta: { source: { upstream: 'sample', fetchedAt: new Date(NOW).toISOString(), cached: false } },
}

export function sampleSeriesMatches() {
  return {
    success: true,
    result: {
      count: 1,
      matches: [sampleListItems.recent[0]],
    },
    meta: { source: { upstream: 'sample', fetchedAt: new Date(NOW).toISOString(), cached: false } },
  }
}

export function sampleSearchHits(query: string) {
  const q = query.trim().toLowerCase()
  const pool = [...sampleListItems.live, ...sampleListItems.recent, ...sampleListItems.upcoming]
  const hits = pool
    .filter((m) => String(m.teams).toLowerCase().includes(q) || String(m.series).toLowerCase().includes(q))
    .map((m) => ({ matchId: String(m.matchId), teams: m.teams, status: String(m.status ?? ''), live: Boolean(m.live), detail: m.detail as string | undefined, series: m.series }))
  return { success: true, result: { matches: hits }, meta: {} }
}

export const sampleEmptyStandings = (leagueId: string) => ({
  success: true,
  result: { leagueId, season: null, groups: [] },
  meta: { source: { upstream: 'sample', fetchedAt: new Date().toISOString(), cached: false, source: 'sample' } },
})

export const sampleEmptySeries = () => ({
  success: true,
  result: { count: 0, matches: [] },
  meta: { source: { upstream: 'sample', fetchedAt: new Date().toISOString(), cached: false, source: 'sample' } },
})

export const sampleEnvelope = (matches: MatchListItemRaw[], found: boolean) => ({
  success: true,
  result: { found, count: matches.length, matches },
  meta: { primary: { upstream: 'sample', fetchedAt: new Date().toISOString(), cached: false, source: 'fixture' } },
})
