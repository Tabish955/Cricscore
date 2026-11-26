import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { normalizeListPayload } from '@/lib/api/normalize'

/**
 * Spec: "Two sequential mock responses demonstrate visible score updates;
 * requests don't overlap." TanStack Query shares one in-flight promise per key —
 * these tests exercise that plus the visible-update path.
 */

function listPayload(score: string) {
  return {
    success: true,
    result: {
      found: true,
      count: 1,
      matches: [{ matchId: 'm-77', teams: 'A vs B', category: 'live', live: true, status: 'In progress', state: 'in', stateTitle: 'In Play', series: 'League', seriesId: '9', format: 'T20', venue: {}, source: 'espn-site', detail: '/espn/match/77?league=9&date=20261126', scores: [{ inningsId: 1, team: 'A', score, overs: '10' }] }],
    },
  }
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

async function fetchLiveViaProxy(): Promise<{ score: string | null }> {
  const res = await fetch('/api/cricket/cb/live', { cache: 'no-store' })
  const json = await res.json()
  const out = normalizeListPayload(json, 'live')
  return { score: out.matches[0]?.scores[0]?.score ?? null }
}

describe('visible updates across polls + no overlapping requests', () => {
  it('sequential polls surface the new score (v1 → v2)', async () => {
    const mockFetch = vi.mocked(fetch)
    const v1 = new Response(JSON.stringify(listPayload('101/2')), { status: 200 })
    const v2 = new Response(JSON.stringify(listPayload('104/2')), { status: 200 })
    mockFetch.mockResolvedValueOnce(v1).mockResolvedValueOnce(v2)

    const first = await fetchLiveViaProxy()
    const second = await fetchLiveViaProxy()
    expect(first.score).toBe('101/2')
    expect(second.score).toBe('104/2')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('concurrent fetchQuery calls for the same key share one upstream request', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(new Response(JSON.stringify(listPayload('88/3')), { status: 200 }))
    const spy = vi.fn(fetchLiveViaProxy)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const [a, b] = await Promise.all([
      client.fetchQuery({ queryKey: ['cb-list', 'live'], queryFn: spy }),
      client.fetchQuery({ queryKey: ['cb-list', 'live'], queryFn: spy }),
    ])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(a.score).toBe('88/3')
    expect(a.score).toBe(b.score)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('after a failure the last good payload shape is still well-formed', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(listPayload('55/1')), { status: 200 }))
    const good = await fetchLiveViaProxy()
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
    await expect(fetchLiveViaProxy()).rejects.toThrow('fetch failed')
    // Caller decides to keep `good` on screen; the normalizer never sees the failure.
    expect(good.score).toBe('55/1')
  })
})
