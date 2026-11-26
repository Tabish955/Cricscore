import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Sample Mode is the presentation-day fallback: when every network call is
 * cut, switching the localStorage flag must make the app render from the
 * recorded fictional dataset instead of crashing or hanging.
 * These tests simulate exactly that — fetch is stubbed to throw.
 */

function installWindowWithFlag(on: boolean) {
  const backing = new Map<string, string>()
  if (on) backing.set('cricscore:sample-mode:v1', '1')
  const storage = {
    getItem: (k: string) => (backing.has(k) ? backing.get(k)! : null),
    setItem: (k: string, v: string) => { backing.set(k, String(v)) },
    removeItem: (k: string) => { backing.delete(k) },
    clear: () => backing.clear(),
    key: () => null,
    get length() { return backing.size },
  } as unknown as Storage
  ;(globalThis as Record<string, unknown>).window = { localStorage: storage, navigator: { onLine: true } }
  return backing
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete (globalThis as Record<string, unknown>).window
})

describe('sample mode wiring (network fully down)', () => {
  it('fetchList returns normalized fictional matches', async () => {
    installWindowWithFlag(true)
    const { fetchList } = await import('@/lib/api/client')
    const { data } = await fetchList('live')
    expect(data.matches.length).toBe(1)
    expect(data.matches[0]?.matchId).toBe('9000000001')
    expect(data.provenance.upstream).toBe('sample')
  })

  it('fetchMatchDetail / Scorecard / Commentary / Squads resolve from the recording', async () => {
    installWindowWithFlag(true)
    const { fetchList, fetchMatchDetail, fetchScorecard, fetchCommentaryPage, fetchSquads } = await import('@/lib/api/client')
    const live = (await fetchList('live')).data.matches[0]!
    const detail = (await fetchMatchDetail(live)).data!
    expect(detail.matchId).toBe('9000000001')
    expect((await fetchScorecard(detail)).data.innings.length).toBeGreaterThanOrEqual(2)
    expect((await fetchCommentaryPage(detail, 1)).data.page).toBe(1)
    expect((await fetchSquads(detail)).data.teams).toHaveLength(2)
  })

  it('unsupported entity fails loudly, never silently', async () => {
    installWindowWithFlag(true)
    const { fetchList, fetchScorecard } = await import('@/lib/api/client')
    const upcoming = (await fetchList('upcoming')).data.matches[0]!
    await expect(fetchScorecard(upcoming)).rejects.toThrow(/no recorded scorecard/i)
  })

  it('standings only exist for the sample league; other leagues get an honest empty table', async () => {
    installWindowWithFlag(true)
    const { fetchStandings } = await import('@/lib/api/client')
    const sample = (await fetchStandings('9001')).data
    expect(sample.groups[0]?.entries).toHaveLength(4)
    const other = (await fetchStandings('8661')).data
    expect(other.groups).toHaveLength(0)
  })

  it('diagnostics say it is sample mode, not a real probe', async () => {
    installWindowWithFlag(true)
    const { fetchDiagnostics } = await import('@/lib/api/client')
    const health = await fetchDiagnostics('health')
    expect(String((health.body as Record<string, unknown>).status)).toContain('sample')
  })

  it('with the flag OFF, fetchList hits the network (and fails, proving the flag is what switched it)', async () => {
    installWindowWithFlag(false)
    const { fetchList } = await import('@/lib/api/client')
    await expect(fetchList('live')).rejects.toThrow('offline')
  })
})
