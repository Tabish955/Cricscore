import { describe, it, expect, beforeEach } from 'vitest'
import { loadFavorites, toggleFavoriteMatch, toggleFavoriteTeam } from '@/lib/storage'

/**
 * One shared in-memory Storage for the whole file. (Replacing globalThis.window
 * between tests is unreliable under vitest's module graph; clearing the store
 * between tests is not.)
 */
function installInMemoryWindow() {
  const backing = new Map<string, string>()
  const storage = {
    getItem: (k: string) => (backing.has(k) ? backing.get(k)! : null),
    setItem: (k: string, v: string) => { backing.set(k, String(v)) },
    removeItem: (k: string) => { backing.delete(k) },
    clear: () => backing.clear(),
    key: (i: number) => [...backing.keys()][i] ?? null,
    get length() { return backing.size },
  } as unknown as Storage
  ;(globalThis as Record<string, unknown>).window = { localStorage: storage }
  return storage
}

const shared = installInMemoryWindow()
beforeEach(() => shared.clear())

describe('favorites storage', () => {
  it('round-trips favorite matches and keeps provider-scoped keys distinct', () => {
    toggleFavoriteMatch({ key: 'espn:999', provider: 'espn', matchId: '999', label: 'A vs B', seriesName: 'Cup', href: '/match/espn/999' })
    toggleFavoriteMatch({ key: 'cb:999', provider: 'cb', matchId: '999', label: 'A vs B (cb)', seriesName: 'Cup', href: '/match/cb/999' })
    const store = loadFavorites()
    expect(store.matches.map((m) => m.key)).toEqual(['cb:999', 'espn:999']) // newest first
  })

  it('toggles off when the same key is added twice', () => {
    toggleFavoriteMatch({ key: 'espn:1', provider: 'espn', matchId: '1', label: 'X', seriesName: '', href: '/match/espn/1' })
    toggleFavoriteMatch({ key: 'espn:1', provider: 'espn', matchId: '1', label: 'X', seriesName: '', href: '/match/espn/1' })
    expect(loadFavorites().matches).toHaveLength(0)
  })

  it('toggles teams independently of matches', () => {
    toggleFavoriteTeam({ key: 'espn:3609', provider: 'espn', teamId: '3609', name: 'Mumbai', short: 'MUM' })
    expect(loadFavorites().teams).toHaveLength(1)
    toggleFavoriteTeam({ key: 'espn:3609', provider: 'espn', teamId: '3609', name: 'Mumbai', short: 'MUM' })
    expect(loadFavorites().teams).toHaveLength(0)
  })

  it('survives corrupt JSON instead of crashing', () => {
    shared.setItem('cricscore:favorites:v1', '{{{{ not json')
    expect(loadFavorites()).toEqual({ matches: [], teams: [] })
  })

  it('drops malformed entries but keeps valid ones', () => {
    shared.setItem(
      'cricscore:favorites:v1',
      JSON.stringify({
        matches: [
          { key: 'no-colon', provider: 'x', matchId: '1', label: 'bad' },
          { key: 'espn:2', provider: 'espn', matchId: '2', label: 'Good', href: '/match/espn/2', seriesName: '', savedAt: 1 },
        ],
        teams: [{ key: 'espn:3', provider: 'espn', teamId: '3', name: 'Ok' }],
      }),
    )
    const store = loadFavorites()
    expect(store.matches.map((m) => m.key)).toEqual(['espn:2'])
    expect(store.teams.map((t) => t.key)).toEqual(['espn:3'])
  })

})
