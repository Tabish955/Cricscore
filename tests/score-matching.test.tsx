// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { createElement } from 'react'
import { normalizeMatch } from '@/lib/api/normalize'
import { scoreForTeam, sideForScore } from '@/lib/score'
import { TeamBadge } from '@/components/TeamBadge'

afterEach(cleanup)

const row = (team: string, score: string, teamId?: string | number) => ({
  matchId: 'm1', teams: 'A vs B', state: 'in', category: 'live', live: true, status: 'live',
  series: 'Test Series', format: 'T20',
  match: undefined,
  team1: { id: 1603, name: 'Mumbai Indians', short: 'MI', imageUrl: null, flagUrl: null },
  team2: { id: 1604, name: 'Mumbai Indians Women', short: 'MI-W', imageUrl: null, flagUrl: null },
  scores: [
    teamId === undefined ? { team, score, overs: '10', declared: false } : { team, score, overs: '10', declared: false, teamId },
  ],
})

const view = (payload: Record<string, unknown>) => normalizeMatch(payload)!

describe('scores[].teamId join (spec §1)', () => {
  it('carries scores[].teamId through normalization (numbers coerce to strings)', () => {
    const v = view(row('MI-W', '88/2', 1604))
    expect(v.scores[0]!.teamId).toBe('1604')
  })

  it('matches even when feed orders the innings opposite the teams array', () => {
    const v = view({
      ...row('MI-W', '92/1', 1604),
      scores: [
        { team: 'MI-W', score: '92/1', overs: '12.3', declared: false, teamId: 1604 },
        { team: 'MI', score: '150/8', overs: '20', declared: false, teamId: 1603 },
      ],
    })
    const t2 = v.team2!
    const t1 = v.team1!
    expect(scoreForTeam(v.scores, t2)?.score).toBe('92/1')
    expect(scoreForTeam(v.scores, t1)?.score).toBe('150/8')
    expect(sideForScore(v, v.scores[0]!)).toBe(2)
    expect(sideForScore(v, v.scores[1]!)).toBe(1)
  })

  it('distinguishes family-name variants (MI vs MI Women, Pakistan vs Pakistan A) by id, never by substring', () => {
    const v = view({
      ...row('MI', '10/1', 1603),
      team1: { id: 3, name: 'Pakistan', short: 'PAK', imageUrl: null, flagUrl: null },
      team2: { id: 2938, name: 'Pakistan A', short: 'PAK-A', imageUrl: null, flagUrl: null },
      scores: [
        { team: 'PAK-A', score: '250/7', overs: '50', declared: false, teamId: 2938 },
        { team: 'PAK', score: '300/6', overs: '50', declared: false, teamId: 3 },
      ],
    })
    expect(scoreForTeam(v.scores, v.team1!)?.score).toBe('300/6')
    expect(scoreForTeam(v.scores, v.team2!)?.score).toBe('250/7')
  })

  it('an id-bearing row never name-matches the other side', () => {
    const v = view({
      ...row('X', '1/1', 9999), // row belongs to neither side by id
      scores: [{ team: 'Mumbai Indians', score: '77/7', overs: '20', declared: false, teamId: 9999 }],
    })
    expect(scoreForTeam(v.scores, v.team1!)).toBeNull()
    expect(sideForScore(v, v.scores[0]!)).toBeNull()
  })

  it('legacy rows without teamId fall back to full-name comparison, never short-code-alone', () => {
    const v = view({
      ...row('MI', '1/1'),
      scores: [
        { team: 'mumbai indians', score: '140/6', overs: '20', declared: false },
      ],
    })
    expect(scoreForTeam(v.scores, v.team1!)?.score).toBe('140/6')
    const abbrevOnly = view({
      ...row('MI', '1/1'),
      scores: [{ team: 'MI', score: '140/6', overs: '20', declared: false }],
    })
    // "MI" alone must not alias Mumbai Indians (spec: not by abbreviation alone)
    expect(scoreForTeam(abbrevOnly.scores, abbrevOnly.team1!)).toBeNull()
  })
})

describe('TeamBadge reset semantics (spec §4)', () => {
  it('a failed image advances one step; a new imageUrl resets the chain', () => {
    const { container, rerender } = render(
      createElement(TeamBadge, { assetKey: 'espn:60', name: 'Some Club', short: 'SC', imageUrl: 'https://cdn.example.test/old.png', size: 'xs' }),
    )
    const img1 = container.querySelector('img')!
    expect(img1.getAttribute('src')).toBe('https://cdn.example.test/old.png')
    fireEvent.error(img1)
    const img2 = container.querySelector('img')!
    expect(img2.getAttribute('src')).toBe('/api/team-logo/espn/60') // proxy fallback, no retry loop
    rerender(createElement(TeamBadge, { assetKey: 'espn:60', name: 'Some Club', short: 'SC', imageUrl: 'https://cdn.example.test/new.png', size: 'xs' }))
    const img3 = container.querySelector('img')!
    expect(img3.getAttribute('src')).toBe('https://cdn.example.test/new.png') // chain restarted, not stuck on the proxy
  })

  it('a failed WI asset still falls through to the feed flag/monogram without a loop', () => {
    const { container } = render(
      createElement(TeamBadge, { assetKey: 'espn:5000', name: 'West Indies', short: 'WI', flagUrl: 'https://flagcdn.com/w40/unknown.png', size: 'xs' }),
    )
    // Candidate order: WI local asset (sanctioned) → feed flag → monogram
    const img1 = container.querySelector('img')!
    expect(img1.getAttribute('src')).toBe('/flags/west-indies.png')
    fireEvent.error(img1)
    const img2 = container.querySelector('img')!
    expect(img2.getAttribute('src')).toBe('https://flagcdn.com/w40/unknown.png')
    fireEvent.error(img2)
    expect(container.querySelector('img')).toBeNull() // monogram, chain terminates
  })
})
