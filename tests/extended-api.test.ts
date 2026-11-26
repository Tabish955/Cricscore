/**
 * Contract tests for the extended CricketAPI fields (extras, fall of wickets,
 * partnerships) and the improved ESPN standings shape (season objects,
 * displayStats, group id/season).
 *
 * Fixtures here are SYNTHETIC, constructed to the documented contract — the
 * deployed backend does NOT yet send these fields (checked 2026-11-26). Live
 * responses lacking them are also exercised (backward compatibility).
 */
import { describe, it, expect } from 'vitest'
import { normalizeScorecard, normalizeStandings } from '@/lib/api/normalize'

const baseMeta = { source: { source: 'live', upstream: 'https://example.test/espn', fetchedAt: '2026-11-26T00:00:00.000Z', cached: false } }

const battingCard = (innings: Record<string, unknown>[]) => ({
  success: true,
  result: { matchId: 'm1', innings, coverage: 'innings totals and available player statistics' },
  meta: baseMeta,
})

const batsman = (id: string, runs: unknown, balls: unknown) => ({ id, name: `P${id}`, position: 1, runs, balls, fours: 0, sixes: 0, strikeRate: 100, dismissal: 'b Bowler', isBatting: false })

describe('extended scorecard — backward compatibility', () => {
  it('an old scorecard without new fields still normalizes and renders sections as unavailable', () => {
    const view = normalizeScorecard(battingCard([
      { inningsId: 1, team: 'MUM', score: '209/10', overs: '20', declared: false, batsmen: [batsman('1', 51, 34)], bowlers: [] },
      { inningsId: 2, team: 'UTT', score: '123/10', overs: '16.5', declared: false, batsmen: [], bowlers: [] },
    ]))
    expect(view.innings).toHaveLength(2)
    expect(view.innings[0]!.extras).toBeNull()
    expect(view.innings[0]!.fallOfWickets).toBeNull()
    expect(view.innings[0]!.partnerships).toBeNull()
    expect(view.innings[1]!.extras).toBeNull()
  })

  it('keeps four innings separate when the same team bats twice, keyed by inningsId', () => {
    const view = normalizeScorecard(battingCard([
      { inningsId: 1, team: 'IND', score: '200/10', overs: '50', batsmen: [], bowlers: [] },
      { inningsId: 2, team: 'AUS', score: '150/10', overs: '42.1', batsmen: [], bowlers: [] },
      { inningsId: 3, team: 'IND', score: '180/10', overs: '48.3', batsmen: [], bowlers: [] },
      { inningsId: 4, team: 'AUS', score: '210/5', overs: '48.5', batsmen: [], bowlers: [] },
    ]))
    expect(view.innings.map((i) => [i.inningsId, i.team])).toEqual([[1, 'IND'], [2, 'AUS'], [3, 'IND'], [4, 'AUS']])
    expect(view.innings.map((i) => i.overs)).toEqual(['50', '42.1', '48.3', '48.5'])
  })
})

describe('extended scorecard — extras', () => {
  const inn = (extras: unknown) => ({ inningsId: 1, team: 'MUM', score: '209/10', overs: '20', batsmen: [], bowlers: [], extras })

  it('preserves real zeros — 0 is data, not absent', () => {
    const view = normalizeScorecard(battingCard([inn({ total: 0, byes: 0, legByes: 0, noBalls: 0, wides: 0, penalties: 0 })]))
    expect(view.innings[0]!.extras).toEqual({ total: 0, byes: 0, legByes: 0, noBalls: 0, wides: 0, penalties: 0 })
  })

  it('keeps the provider total verbatim and never recomputes it from the breakdown', () => {
    // Decomposition deliberately sums to something different from total (7):
    const view = normalizeScorecard(battingCard([inn({ total: 7, byes: 1, legByes: 2, noBalls: 1, wides: 3, penalties: 0 })]))
    const ex = view.innings[0]!.extras!
    expect(ex.total).toBe(7) // exactly what the provider sent — never recomputed
    expect((ex.byes ?? 0) + (ex.legByes ?? 0) + (ex.noBalls ?? 0) + (ex.wides ?? 0) + (ex.penalties ?? 0)).toBe(7)
    const skew = normalizeScorecard(battingCard([inn({ total: 99, byes: 1 })]))
    expect(skew.innings[0]!.extras!.total).toBe(99)
    expect(skew.innings[0]!.extras!.wides).toBeNull()
  })

  it('distinguishes null total, absent breakdown and junk values', () => {
    const view = normalizeScorecard(battingCard([inn({ total: null, wides: 'three' })]))
    const ex = view.innings[0]!.extras!
    expect(ex.total).toBeNull()
    expect(ex.wides).toBeNull()
    expect(ex.byes).toBeNull()
  })

  it('null extras section means unavailable — not zero', () => {
    const view = normalizeScorecard(battingCard([inn(null)]))
    expect(view.innings[0]!.extras).toBeNull()
  })
})

describe('extended scorecard — fall of wickets', () => {
  const inn = (fallOfWickets: unknown) => ({ inningsId: 1, team: 'MUM', score: '209/10', overs: '20', batsmen: [], bowlers: [], fallOfWickets })

  it('keeps team score and batter score distinct; preserves provider order and type', () => {
    const view = normalizeScorecard(battingCard([inn([
      { wicketNumber: 1, overs: '4.4', runs: 66, type: 'c Tamore b Shah', batsman: { id: '1292495', name: 'Angkrish Raghuvanshi' }, batsmanRuns: 26, ballsFaced: 15 },
      { wicketNumber: 2, overs: '9.1', runs: 120, type: 'run out', batsman: { id: '1212583', name: 'Hardik Tamore' }, batsmanRuns: 39, ballsFaced: 14 },
    ])]))
    const f = view.innings[0]!.fallOfWickets!
    expect(f).toHaveLength(2)
    expect(f[0]).toMatchObject({ wicketNumber: 1, runs: 66, batsmanRuns: 26, type: 'c Tamore b Shah' })
    expect(f[0]!.overs).toBe('4.4') // cricket notation, not 4.4 decimal
    expect(f[1]!.type).toBe('run out') // not assumed to be a conventional dismissal
  })

  it('empty array is explicitly empty, not unavailable; null/undefined mean unavailable', () => {
    expect(normalizeScorecard(battingCard([inn([])])).innings[0]!.fallOfWickets).toEqual([])
    expect(normalizeScorecard(battingCard([inn(null)])).innings[0]!.fallOfWickets).toBeNull()
    const missing = battingCard([{ inningsId: 1, team: 'MUM', score: '10/0', overs: '2', batsmen: [], bowlers: [] }])
    expect(normalizeScorecard(missing).innings[0]!.fallOfWickets).toBeNull()
  })
})

describe('extended scorecard — partnerships', () => {
  const inn = (partnerships: unknown) => ({ inningsId: 1, team: 'MUM', score: '209/10', overs: '20', batsmen: [], bowlers: [], partnerships })

  it('batter contributions need not sum to the partnership total (extras belong to no batter)', () => {
    const view = normalizeScorecard(battingCard([inn([
      { wicketNumber: 1, type: 'wicket', runs: 66, overs: '4.4', runRate: 14.14, start: { overs: '0.0', runs: 0, wickets: 0 }, end: { overs: '4.4', runs: 66, wickets: 1 }, batsmen: [
        { id: '1212583', name: 'Hardik Tamore', runs: 39, balls: 14 },
        { id: '1292495', name: 'Angkrish Raghuvanshi', runs: 26, balls: 15 },
      ] },
    ])]))
    const p = view.innings[0]!.partnerships![0]!
    expect(p.runs).toBe(66)
    expect(p.batsmen.reduce((s, b) => s + (b.runs ?? 0), 0)).toBe(65)
    expect(p.overs).toBe('4.4')
    expect(p.start).toEqual({ overs: '0.0', runs: 0, wickets: 0 })
    expect(p.end).toEqual({ overs: '4.4', runs: 66, wickets: 1 })
  })

  it('tolerates missing endpoints and empty batsman lists without inventing', () => {
    const view = normalizeScorecard(battingCard([inn([
      { wicketNumber: 3, runs: 20, overs: '2.3' },
    ])]))
    const p = view.innings[0]!.partnerships![0]!
    expect(p.start).toBeNull()
    expect(p.end).toBeNull()
    expect(p.batsmen).toEqual([])
    expect(p.runRate).toBeNull()
    expect(p.type).toBeNull() // fowType absent — not guessed
  })

  it('empty array is explicitly empty, not unavailable; null means unavailable', () => {
    expect(normalizeScorecard(battingCard([inn([])])).innings[0]!.partnerships).toEqual([])
    expect(normalizeScorecard(battingCard([inn(null)])).innings[0]!.partnerships).toBeNull()
  })
})

describe('standings — improved ESPN contract', () => {
  const entry = (id: string, stats: Record<string, unknown>, displayStats?: Record<string, unknown>, imageUrl?: string) => ({
    team: { id, name: `Team ${id}`, short: `T${id}`, ...(imageUrl ? { imageUrl } : {}) },
    stats,
    ...(displayStats ? { displayStats } : {}),
  })
  const envelope = (result: Record<string, unknown>) => ({ success: true, result, meta: baseMeta })

  it('season object {year, startDate, endDate} normalizes to a year label + validated meta — never [object Object]', () => {
    const view = normalizeStandings(envelope({
      leagueId: '8661',
      season: { year: 2026, startDate: '2026-11-14T00:00Z', endDate: '2026-12-06T23:59Z' },
      groups: [{ name: 'Elite, Group A', entries: [entry('1559', { rank: 1, matchPoints: 20 })] }],
    }))
    expect(view.season).toBe('2026')
    expect(view.seasonMeta).toEqual({ year: 2026, startDate: '2026-11-14', endDate: '2026-12-06' })
    expect(view.groups[0]!.season).toBeNull()
  })

  it('string, numeric and absent seasons all behave; junk dates are dropped', () => {
    expect(normalizeStandings(envelope({ leagueId: '1', season: '2026', groups: [] })).season).toBe('2026')
    expect(normalizeStandings(envelope({ leagueId: '1', season: 2026, groups: [] })).season).toBe('2026')
    expect(normalizeStandings(envelope({ leagueId: '1', groups: [] })).season).toBeNull()
    expect(normalizeStandings(envelope({ leagueId: '1', season: { year: 2026, startDate: 'soon' }, groups: [] })).seasonMeta).toEqual({ year: 2026, startDate: null, endDate: null })
  })

  it('displayStats win verbatim; numeric stats are fallbacks; zero points stay zero', () => {
    const view = normalizeStandings(envelope({
      leagueId: '8661',
      groups: [{ id: 'g1', name: 'Elite, Group A', season: 2026, entries: [
        entry('1', { rank: 1, matchesPlayed: 7, matchPoints: 0, netrr: -1.65 }, { netrr: '-1.650', for: '137/20.0', against: '129/18.3' }),
        entry('2', { rank: 2, matchesPlayed: 7, matchPoints: 2, matchesTied: 0, matchesDraw: 1, noresult: 0 }),
      ] }],
    }))
    const [e1, e2] = view.groups[0]!.entries
    expect(e1!.known.matchPoints).toBe(0)
    expect(e1!.display.netrr).toBe('-1.650')
    expect(e1!.display.for).toBe('137/20.0')       // runs/overs string verbatim — never parsed as a rate
    expect(e1!.display.against).toBe('129/18.3')
    expect(e2!.known.matchesDraw).toBe(1)
    expect(e2!.known.matchPoints).toBe(2)
    expect(view.groups[0]!.id).toBe('g1')
    expect(view.groups[0]!.season).toBe(2026)
  })

  it('numeric for/against are kept verbatim (run-rate scale) when no displayStats exist', () => {
    const view = normalizeStandings(envelope({
      leagueId: '8661',
      groups: [{ name: '', entries: [entry('1156783', { rank: 1, for: 6.85, against: 6.8 })] }],
    }))
    expect(view.groups[0]!.entries[0]!.display.for).toBe('6.85')
    expect(view.groups[0]!.entries[0]!.display.against).toBe('6.8')
  })

  it('empty groups = "no table published" state, not an error; missing imageUrl stays null', () => {
    const view = normalizeStandings(envelope({ leagueId: '999', groups: [] }))
    expect(view.groups).toEqual([])
    const noLogos = normalizeStandings(envelope({
      leagueId: '1',
      groups: [{ name: '', entries: [{ team: { id: '1156783', name: 'Meghalaya', short: 'MEG' }, stats: { rank: 1 } }] }],
    }))
    expect(noLogos.groups[0]!.entries[0]!.team!.imageUrl).toBeNull()
  })

  it('netrr sign and precision are preserved as supplied', () => {
    const view = normalizeStandings(envelope({
      leagueId: '1',
      groups: [{ name: 'T', entries: [entry('1', { netrr: 0.05 }), entry('2', { netrr: -4.258 })] }],
    }))
    expect(view.groups[0]!.entries[0]!.known.netrr).toBe('0.05')
    expect(view.groups[0]!.entries[1]!.known.netrr).toBe('-4.258')
  })

  it('league name is passed through when supplied (new contract field)', () => {
    const view = normalizeStandings(envelope({ leagueId: '8661', name: 'Syed Mushtaq Ali Trophy', groups: [] }))
    expect(view.name).toBe('Syed Mushtaq Ali Trophy')
    expect(normalizeStandings(envelope({ leagueId: '8661', groups: [] })).name).toBeNull()
  })
})
