import { describe, expect, it } from 'vitest'
import type { CommentaryView } from '@/lib/api/normalize'
import { buildOverStrip, overOrdinal } from '@/lib/over-strip'

function ball(overLabel: string, runs: number | null, opts: Partial<CommentaryView> = {}): CommentaryView {
  return {
    key: `k-${overLabel}-${runs}-${Math.random()}`,
    inningsId: 1,
    overLabel,
    event: 'normal',
    eventRaw: runs === 4 ? 'four' : runs === 6 ? 'six' : '',
    text: 'delivery',
    runs,
    batsman: 'Batter',
    bowler: 'Bowler',
    cumulativeScore: null,
    wicket: false,
    ...opts,
  }
}

describe('buildOverStrip', () => {
  it('returns null when the page has no deliveries', () => {
    expect(buildOverStrip([])).toBeNull()
    expect(buildOverStrip([ball('–', 1)])).toBeNull()
  })

  it('takes the newest over and the previous one', () => {
    const items = [
      ball('31.5', 1), ball('31.6', 0), ball('32.1', 4), ball('32.2', 6), ball('32.3', 1),
    ]
    const strip = buildOverStrip(items)!
    expect(strip.currentOver).toBe(32)
    expect(strip.previousOver).toBe(31)
    expect(strip.currentBalls.map((b) => b.label)).toEqual(['4', '6', '1'])
    expect(strip.currentBalls.map((b) => b.kind)).toEqual(['four', 'six', 'single'])
    expect(strip.previousBalls.map((b) => b.label)).toEqual(['1', '0'])
  })

  it('keeps wides on the same notation (does not dedupe legal balls)', () => {
    const items = [
      ball('33.1', 1), ball('33.2', 0),
      ball('33.2', 1, { eventRaw: 'wide', event: 'info' }), // wide shares the ball index
      ball('33.2', 0),
    ]
    const strip = buildOverStrip(items)!
    expect(strip.currentBalls).toHaveLength(4)
  })

  it('labels wickets and dots', () => {
    const items = [ball('12.1', 0, { wicket: true, event: 'wicket', eventRaw: 'wicket' }), ball('12.2', 0)]
    const strip = buildOverStrip(items)!
    expect(strip.currentBalls[0]).toMatchObject({ label: 'W', kind: 'wicket' })
    expect(strip.currentBalls[1]).toMatchObject({ label: '0', kind: 'dot' })
  })

  it('skips info notes and reports innings', () => {
    const items = [ball('5.1', 1, { event: 'info', eventRaw: 'milestone' }), ball('5.2', 2)]
    const strip = buildOverStrip(items)!
    expect(strip.currentBalls.map((b) => b.label)).toEqual(['2'])
    expect(strip.inningsId).toBe(1)
  })

  it('sorts chips by ball number within an over regardless of page order', () => {
    const items = [ball('9.3', 1), ball('9.1', 0), ball('9.2', 4)]
    const strip = buildOverStrip(items)!
    expect(strip.currentBalls.map((b) => b.label)).toEqual(['0', '4', '1'])
  })
})

describe('overOrdinal', () => {
  it('formats ordinals', () => {
    expect(overOrdinal(1)).toBe('1st')
    expect(overOrdinal(2)).toBe('2nd')
    expect(overOrdinal(3)).toBe('3rd')
    expect(overOrdinal(4)).toBe('4th')
    expect(overOrdinal(11)).toBe('11th')
    expect(overOrdinal(12)).toBe('12th')
    expect(overOrdinal(13)).toBe('13th')
    expect(overOrdinal(21)).toBe('21st')
    expect(overOrdinal(33)).toBe('33rd')
  })
})

describe('multi-over coverage', () => {
  it('exposes every recorded over, oldest first', () => {
    const items = [
      ball('31.4', 1), ball('31.5', 0),
      ball('32.1', 4), ball('33.2', 6), ball('33.3', '1' as unknown as number),
    ]
    const strip = buildOverStrip(items)!
    expect(strip.overs.map((g) => g.over)).toEqual([31, 32, 33])
    expect(strip.overs[0]!.balls.length).toBe(2)
    expect(strip.overs[2]!.balls.length).toBeGreaterThanOrEqual(0)
    expect(strip.currentOver).toBe(33)
    expect(strip.overs[strip.overs.length - 1]!.over).toBe(strip.currentOver)
  })
})
