import { describe, it, expect } from 'vitest'
import { retryDelayMs, shouldRetry, staleLabel, listPollInterval, POLL } from '@/lib/polling'

describe('polling backoff', () => {
  it('grows exponentially: ~15s → ~30s → ~60s, capped', () => {
    const seq = [1, 2, 3, 4, 5].map((n) => retryDelayMs(n, () => 0.5))
    expect(seq[0]).toBeGreaterThanOrEqual(14_000 * 0.9)
    expect(seq[1]).toBeGreaterThan(seq[0]!)
    expect(seq[2]).toBeGreaterThan(seq[1]!)
    expect(seq[3]).toBeLessThanOrEqual(60_000 * 1.25)
    expect(seq[4]).toBeLessThanOrEqual(60_000 * 1.25)
  })

  it('jitter stays within ±20%', () => {
    for (const rand of [0, 0.25, 0.5, 0.75, 0.999]) {
      const d = retryDelayMs(1, () => rand)
      expect(d).toBeGreaterThanOrEqual(12_000)
      expect(d).toBeLessThanOrEqual(18_001)
    }
  })

  it('bounds retries; 404 gets at most one quick retry, 429/5xx use the ladder', () => {
    expect(shouldRetry(0, { status: 404 })).toBe(true)
    expect(shouldRetry(1, { status: 404 })).toBe(false)
    expect(shouldRetry(0, { status: 429 })).toBe(true)
    expect(shouldRetry(1, { status: 429 })).toBe(true)
    expect(shouldRetry(2, { status: 429 })).toBe(true)
    expect(shouldRetry(3, { status: 429 })).toBe(false)
    expect(shouldRetry(0, { status: 502 })).toBe(true)
    expect(shouldRetry(0, new Error('network down'))).toBe(true)
    expect(shouldRetry(3, new Error('network down'))).toBe(false)
  })

  it('uses the spec\'s intervals', () => {
    expect(POLL.liveList).toBe(15_000)
    expect(POLL.matchDetailLive).toBe(10_000)
    expect(POLL.commentaryLive).toBe(20_000)
    expect(POLL.recentList).toBe(60_000)
    expect(POLL.upcomingList).toBe(120_000)
    expect(POLL.squads).toBe(300_000)
    expect(listPollInterval('live')).toBe(15_000)
    expect(listPollInterval('recent')).toBe(60_000)
    expect(listPollInterval('upcoming')).toBe(120_000)
  })

  it('describes last-good age honestly', () => {
    const now = 1_000_000_000_000
    expect(staleLabel(null, now)).toBe('No successful fetch yet')
    expect(staleLabel(now - 45_000, now)).toContain('45s')
    expect(staleLabel(now - 5 * 60_000, now)).toContain('5m')
    expect(staleLabel(now - 3 * 3_600_000, now)).toContain('3h')
  })
})
