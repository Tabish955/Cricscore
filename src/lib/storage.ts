/**
 * Safe localStorage helpers. Provider-scoped keys everywhere: `espn:1546783`
 * and `cb:1546783` never collide. Every read is guarded — corrupt JSON or a
 * blocked storage (private mode) degrades to empty instead of crashing.
 */

const FAVORITES_KEY = 'cricscore:favorites:v1'
const TEAM_ASSETS_KEY = 'cricscore:team-assets:v1'

export interface FavoriteMatch {
  key: string // provider:matchId
  provider: string
  matchId: string
  label: string // "A vs B" at time of saving
  seriesName: string
  href: string
  savedAt: number
}

export interface FavoriteTeam {
  key: string // provider:teamId
  provider: string
  teamId: string
  name: string
  short: string
  savedAt: number
}

export interface FavoritesStore {
  matches: FavoriteMatch[]
  teams: FavoriteTeam[]
}

/** Fresh object every call — a shared module-level array leaks mutations between readers. */
function emptyStore(): FavoritesStore {
  return { matches: [], teams: [] }
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const probe = '__cricscore_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

export function loadFavorites(): FavoritesStore {
  const s = storage()
  if (!s) return emptyStore()
  try {
    const raw = s.getItem(FAVORITES_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<FavoritesStore>
    const matches = Array.isArray(parsed.matches) ? parsed.matches.filter(isFavoriteMatch).slice(0, 50) : []
    const teams = Array.isArray(parsed.teams) ? parsed.teams.filter(isFavoriteTeam).slice(0, 100) : []
    return { matches, teams }
  } catch {
    return emptyStore()
  }
}

export function saveFavorites(store: FavoritesStore): boolean {
  const s = storage()
  if (!s) return false
  try {
    s.setItem(FAVORITES_KEY, JSON.stringify({ matches: store.matches.slice(0, 50), teams: store.teams.slice(0, 100) }))
    return true
  } catch {
    return false
  }
}

function isFavoriteMatch(v: unknown): v is FavoriteMatch {
  if (!v || typeof v !== 'object') return false
  const m = v as Record<string, unknown>
  return typeof m.key === 'string' && m.key.includes(':') && typeof m.provider === 'string' && typeof m.matchId === 'string' && typeof m.label === 'string'
}

function isFavoriteTeam(v: unknown): v is FavoriteTeam {
  if (!v || typeof v !== 'object') return false
  const t = v as Record<string, unknown>
  return typeof t.key === 'string' && t.key.includes(':') && typeof t.provider === 'string' && typeof t.teamId === 'string' && typeof t.name === 'string'
}

export function toggleFavoriteMatch(fav: Omit<FavoriteMatch, 'savedAt'>): FavoritesStore {
  const store = loadFavorites()
  const idx = store.matches.findIndex((m) => m.key === fav.key)
  if (idx >= 0) store.matches.splice(idx, 1)
  else store.matches.unshift({ ...fav, savedAt: Date.now() })
  saveFavorites(store)
  return store
}

export function toggleFavoriteTeam(fav: Omit<FavoriteTeam, 'savedAt'>): FavoritesStore {
  const store = loadFavorites()
  const idx = store.teams.findIndex((t) => t.key === fav.key)
  if (idx >= 0) store.teams.splice(idx, 1)
  else store.teams.unshift({ ...fav, savedAt: Date.now() })
  saveFavorites(store)
  return store
}

/* ------------------------------------------------------- team-asset registry */

interface TeamAssetEntry {
  imageUrl: string
  seenAt: number
}

/**
 * Populated from VERIFIED feed/detail team metadata (never guessed from an ID).
 * Key: `provider:teamId`. Falls back gracefully when storage is unavailable.
 */
export function loadTeamAssets(): Map<string, string> {
  const map = new Map<string, string>()
  const s = storage()
  if (s) {
    try {
      const raw = s.getItem(TEAM_ASSETS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, TeamAssetEntry>
        for (const [key, entry] of Object.entries(parsed)) {
          if (entry && typeof entry.imageUrl === 'string' && /^https:\/\//i.test(entry.imageUrl)) {
            map.set(key, entry.imageUrl)
          }
        }
      }
    } catch {
      /* corrupt registry -> ignore, monogram fallback will render */
    }
  }
  return map
}

export function rememberTeamAssets(entries: Array<{ key: string; imageUrl: string | null }>): void {
  const s = storage()
  if (!s) return
  try {
    const raw = s.getItem(TEAM_ASSETS_KEY)
    const parsed: Record<string, TeamAssetEntry> = raw ? (JSON.parse(raw) as Record<string, TeamAssetEntry>) : {}
    for (const { key, imageUrl } of entries) {
      if (!imageUrl || !/^https:\/\//i.test(imageUrl)) continue
      parsed[key] = { imageUrl, seenAt: Date.now() }
    }
    s.setItem(TEAM_ASSETS_KEY, JSON.stringify(parsed))
  } catch {
    /* non-fatal */
  }
}
