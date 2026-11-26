import { describe, expect, it } from 'vitest'
import { classifyBallEvent } from '@/lib/event-glyph'

describe('classifyBallEvent', () => {
  it('wicket wins over runs', () => {
    expect(classifyBallEvent({ event: 'wicket', runs: 1, wicket: true }).kind).toBe('wicket')
    expect(classifyBallEvent({ event: 'run', runs: 0, wicket: true }).kind).toBe('wicket')
  })
  it('sixes and fours by event string and by runs', () => {
    expect(classifyBallEvent({ event: 'six', runs: 6, wicket: false }).kind).toBe('six')
    expect(classifyBallEvent({ event: 'run', runs: 6, wicket: false }).kind).toBe('six')
    expect(classifyBallEvent({ event: 'four', runs: 4, wicket: false }).kind).toBe('four')
    expect(classifyBallEvent({ event: 'no run', runs: 4, wicket: false }).kind).toBe('four')
  })
  it('singles, twos, threes', () => {
    expect(classifyBallEvent({ event: 'run', runs: 1, wicket: false }).kind).toBe('single')
    expect(classifyBallEvent({ event: 'run', runs: 2, wicket: false }).kind).toBe('two')
    expect(classifyBallEvent({ event: 'run', runs: 3, wicket: false }).kind).toBe('three')
  })
  it('dot balls', () => {
    expect(classifyBallEvent({ event: 'no run', runs: 0, wicket: false }).kind).toBe('dot')
    expect(classifyBallEvent({ event: '', runs: 0, wicket: false }).kind).toBe('dot')
  })
  it('extras and unknown', () => {
    expect(classifyBallEvent({ event: 'wide', runs: 1, wicket: false }).kind).toBe('extra')
    expect(classifyBallEvent({ event: 'no ball', runs: 1, wicket: false }).label).toBe('EXTRA')
    expect(classifyBallEvent({ event: '', runs: null, wicket: false }).kind).toBe('unknown')
  })
})
