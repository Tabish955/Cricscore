// @vitest-environment jsdom
/**
 * UI smoke tests (jsdom — no real layout engine). These verify rendering of the
 * new sections, empty/unavailable states and image fallbacks. They are NOT a
 * substitute for a visual/viewport pass; the Arena preview covers that.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ScorecardView } from '@/components/match/ScorecardView'
import { StandingsTable } from '@/components/StandingsTable'
import { TeamIdentity } from '@/components/TeamIdentity'
import { SportskeedaAdditionalSource } from '@/components/SportskeedaAdditionalSource'
import { normalizeScorecard, normalizeStandings } from '@/lib/api/normalize'
import { createElement, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'

afterEach(cleanup)

const meta = { source: { source: 'live', upstream: 'https://example.test/x', fetchedAt: '2026-11-26T00:00:00.000Z', cached: false } }

const scorecardPayload = (extended: boolean) => ({
  success: true,
  result: {
    matchId: '1546786',
    coverage: 'innings totals and available player statistics',
    innings: [
      {
        inningsId: 1, team: 'MUM', score: '209/10', overs: '20', declared: false,
        batsmen: [{ id: 'b1', name: 'A. Raghuvanshi', position: 1, runs: 51, balls: 34, fours: 4, sixes: 3, strikeRate: 150, dismissal: 'b Shah', isBatting: false }],
        bowlers: [{ id: 'bw1', name: 'Y. Chaudhary', teamId: 't2', overs: '4', maidens: 0, runs: 38, wickets: 0, economy: 9.5, wides: 0, noBalls: 0 }],
        ...(extended ? {
          extras: { total: 7, byes: 1, legByes: 2, noBalls: 1, wides: 3, penalties: 0 },
          fallOfWickets: [
            { wicketNumber: 1, overs: '4.4', runs: 66, type: 'c Tamore b Shah', batsman: { id: 'b1', name: 'A. Raghuvanshi' }, batsmanRuns: 51, ballsFaced: 34 },
          ],
          partnerships: [
            { wicketNumber: 1, type: 'wicket', runs: 66, overs: '4.4', runRate: 14.14, start: { overs: '0.0', runs: 0, wickets: 0 }, end: { overs: '4.4', runs: 66, wickets: 1 }, batsmen: [
              { id: 'b1', name: 'A. Raghuvanshi', runs: 39, balls: 14 },
              { id: 'b2', name: 'H. Tamore', runs: 26, balls: 15 },
            ] },
          ],
        } : {}),
      },
      {
        inningsId: 2, team: 'UTT', score: '123/10', overs: '16.5', declared: false,
        batsmen: [], bowlers: [],
        ...(extended ? { extras: { total: 0, byes: 0, legByes: 0, noBalls: 0, wides: 0, penalties: 0 }, fallOfWickets: [], partnerships: [] } : {}),
      },
      {
        inningsId: 3, team: 'MUM', score: '180/4', overs: '20', declared: false,
        batsmen: [], bowlers: [],
        ...(extended ? { extras: null, fallOfWickets: null, partnerships: null } : {}),
      },
    ],
  },
  meta,
})

const renderCard = (view: ReturnType<typeof normalizeScorecard>, rerenderWith?: ReturnType<typeof normalizeScorecard>) => {
  const noop = () => {}
  const props = { view, stale: false, refreshedAt: Date.parse('2026-11-26T00:00:00.000Z'), onRefresh: noop, isFetching: false }
  const utils = render(createElement(ScorecardView, props))
  if (rerenderWith) utils.rerender(createElement(ScorecardView, { ...props, view: rerenderWith }))
  return utils
}

describe('ScorecardView — extended sections', () => {
  it('renders extras (real zeros), fall of wickets and partnerships for supplied innings', () => {
    const view = normalizeScorecard(scorecardPayload(true))
    renderCard(view)
    // Innings 1: full sections
    const extrasLabels = screen.getAllByText('Extras', { selector: 'span' })
    expect(extrasLabels.length).toBeGreaterThan(0)
    expect(screen.getByText('66', { selector: 'span.tabular' })).toBeTruthy()
    expect(screen.getAllByText(/A\. Raghuvanshi/).length).toBeGreaterThan(0)
    // Innings 2: explicit zeros render as 0, not —
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    // empty FOW/partnerships states render their explicit-empty copy
    expect(screen.getByText(/No wickets have fallen/i)).toBeTruthy()
    expect(screen.getByText(/No partnerships recorded/i)).toBeTruthy()
    // Innings 3 (same team again): unavailable states, not zeros
    expect(screen.getAllByText(/not supplied for this match/i).length).toBeGreaterThan(0)
  })

  it('old scorecard without new fields shows one consolidated not-supplied note, never zeros', () => {
    const view = normalizeScorecard(scorecardPayload(false))
    renderCard(view)
    expect(screen.queryAllByText(/not supplied for this match/i).length).toBe(0) // consolidated, not 3 placeholders per innings
    expect(screen.getByText(/not supplied by the provider for this match/i)).toBeTruthy()
  })

  it('re-fetch preserves innings order and identities (keyed by inningsId, all innings kept)', () => {
    const v1 = normalizeScorecard(scorecardPayload(true))
    const changed = scorecardPayload(true)
    ;(changed.result.innings[0] as { score: string }).score = '210/10'
    const v2 = normalizeScorecard(changed)
    const utils = renderCard(v1, v2)
    const sections = utils.container.querySelectorAll('section[aria-labelledby]')
    expect(sections).toHaveLength(3)
    expect(Array.from(sections).map((s) => s.getAttribute('aria-labelledby'))).toEqual(['inn-1', 'inn-2', 'inn-3'])
    expect(screen.getAllByText(/210\//).length).toBeGreaterThan(0)
  })

  it('renders partnerships contributions without forcing them to the total', () => {
    const view = normalizeScorecard(scorecardPayload(true))
    renderCard(view)
    expect(screen.getByText(/need not sum to the partnership total/i)).toBeTruthy()
    // contributions render individually; the total renders as supplied — never recomputed
    expect(screen.getByText('39', { selector: 'span.tabular' })).toBeTruthy()
    expect(screen.getByText('26', { selector: 'span.tabular' })).toBeTruthy()
    expect(screen.getByText('66', { selector: 'span.tabular' })).toBeTruthy()
  })
})

const standingsPayload = (over: Record<string, unknown> = {}) => ({
  success: true,
  result: {
    leagueId: '8661',
    name: 'Syed Mushtaq Ali Trophy',
    season: { year: 2026, startDate: '2026-11-14T00:00Z', endDate: '2026-12-06T23:59Z' },
    groups: [
      { name: 'Elite, Group A', entries: [
        { team: { id: '1559', name: 'Baroda', short: 'BRO' }, stats: { rank: 1, matchesPlayed: 7, matchesWon: 5, matchesLost: 2, matchPoints: 0, netrr: 1.561 }, displayStats: { netrr: '+1.561', for: '137/20.0', against: '129/18.3' } },
        { team: { id: '1572', name: 'Bengal', short: 'BEN', imageUrl: 'https://cdn.example.test/ben.png' }, stats: { rank: 2, matchesPlayed: 7, matchesWon: 4, matchesLost: 3, matchPoints: 16, matchesTied: 0, noresult: 0 } },
      ] },
    ],
    ...over,
  },
  meta,
})

describe('StandingsTable', () => {
  it('renders season year (never [object Object]), displayStats verbatim, zero points as 0', () => {
    const view = normalizeStandings(standingsPayload())
    render(createElement(StandingsTable, { view }))
    expect(screen.getByText(/Season 2026/)).toBeTruthy()
    expect(screen.getByText('+1.561')).toBeTruthy()      // verbatim display string
    expect(screen.getByText('137/20.0')).toBeTruthy()    // runs/overs, not a rate
    expect(screen.getAllByText('0', { selector: 'td' }).length).toBeGreaterThan(0) // Baroda's zero points render as 0
    expect(screen.getByText('Syed Mushtaq Ali Trophy', { exact: false })).toBeTruthy()
  })

  it('empty groups render the valid "no table" state, not an error', () => {
    const view = normalizeStandings(standingsPayload({ groups: [] }))
    render(createElement(StandingsTable, { view }))
    expect(screen.getByText(/No table published/i)).toBeTruthy()
  })

  it('groups with zero entries yield the valid "no table" state, not an outage', () => {
    const view = normalizeStandings(standingsPayload({
      groups: [{ id: 'g1', name: 'Playoff', season: 2026, entries: [] }],
    }))
    render(createElement(StandingsTable, { view }))
    expect(screen.getByText(/No table published/i)).toBeTruthy()
  })

  it('group season chip renders alongside a populated group', () => {
    const view = normalizeStandings(standingsPayload({
      groups: [{ id: 'g1', name: 'Playoff', season: 2026, entries: [
        { team: { id: '1', name: 'Baroda', short: 'BRO' }, stats: { rank: 1, matchPoints: 4 } },
      ] }],
    }))
    render(createElement(StandingsTable, { view }))
    expect(screen.getByText('Playoff')).toBeTruthy()
    expect(screen.getAllByText(/Season 2026/).length).toBeGreaterThan(0)
  })
})

describe('TeamIdentity — image failure falls back once', () => {
  it('shows fallback initials badge after the image errors', () => {
    const { container } = render(createElement(TeamIdentity, { assetKey: 'espn:1559', name: 'Baroda', short: 'BRO', imageUrl: 'https://cdn.example.test/baroda.png', size: 'xs' }))
    const img = container.querySelector('img')!
    expect(img).toBeTruthy()
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: /fallback badge/i })).toBeTruthy()
  })

  it('derives the ESPN CDN logo from a numeric espn assetKey when nothing else is known', () => {
    const { container } = render(createElement(TeamIdentity, { assetKey: 'espn:1559', name: 'Baroda', short: 'BRO', size: 'xs' }))
    const img = container.querySelector('img')!
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('https://a.espncdn.com/i/teamlogos/cricket/500/1559.png')
    // a failed derived image still falls back to the monogram, never loops or guesses identity
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: /fallback badge/i })).toBeTruthy()
  })

  it('does not derive CDN logos for non-espn keys (monogram instead)', () => {
    const { container } = render(createElement(TeamIdentity, { assetKey: 'sportskeeda:1559', name: 'Baroda', short: 'BRO', size: 'xs' }))
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: /fallback badge/i })).toBeTruthy()
  })
})

describe('Sportskeeda additional source — not configured (backend route unreleased)', () => {
  const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrap = (node: ReactNode) => render(createElement(QueryClientProvider, { client: client() }, node))

  it('renders "not configured" and no table for any league today', () => {
    wrap(createElement(SportskeedaAdditionalSource, { leagueId: '8661' }))
    expect(screen.getByText(/not configured/i)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('SSR safety — scorecard renders identically enough for hydration', () => {
  it('ScorecardView SSR output contains the innings sections (no browser-only APIs at render)', () => {
    const view = normalizeScorecard(scorecardPayload(true))
    const html = renderToString(createElement(ScorecardView, { view, stale: false, refreshedAt: null, onRefresh: () => {}, isFetching: false }))
    expect(html).toContain('id="inn-1"')
    expect(html).toContain('Extras')
  })
})
