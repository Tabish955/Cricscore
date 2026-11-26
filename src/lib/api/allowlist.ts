/**
 * Allowlist for the same-origin proxy AND for validating API-returned links.
 *
 * Browser code never talks to the upstream host directly. It talks to
 * `/api/cricket/<path>?<query>`; the server route then forwards to the fixed
 * production base. Only the patterns below may pass — anything else is refused,
 * so this cannot become an open proxy.
 */

export const PRODUCTION_API_ORIGIN = 'https://cricketapi-beryl.vercel.app'

/** Every upstream path we are willing to touch. */
const PATH_PATTERNS: RegExp[] = [
  /^health$/,
  /^sources\/status$/,
  // Lists and search
  /^cb\/(live|recent|upcoming|search)$/,
  /^espn\/(live|recent|upcoming)$/,
  /^crex\/(live|recent|upcoming)$/,
  // ESPN match detail family (IDs are digits)
  /^espn\/match\/\d{1,12}(\/(scorecard|squads|commentary))?$/,
  // Dated series scoreboard
  /^espn\/series\/\d{1,12}\/matches$/,
  // Standings by league
  /^espn\/standings\/\d{1,12}$/,
  // Experimental Sportskeeda adapter (backend release pending — see sportskeeda.ts).
  // Slug: lowercase alphanumerics and hyphens only, max 100 chars. Never a URL.
  /^sportskeeda\/series\/[a-z0-9-]{1,100}\/points-table$/,
]

const QUERY_VALIDATORS: Record<string, (v: string) => boolean> = {
  q: (v) => v.length > 0 && v.length <= 120,
  league: (v) => /^\d{1,12}$/.test(v),
  date: (v) => /^\d{8}$/.test(v),
  page: (v) => /^\d{1,3}$/.test(v) && Number(v) <= 999,
}

const ALLOWED_QUERY_KEYS = new Set(Object.keys(QUERY_VALIDATORS))

export interface AllowCheck {
  ok: boolean
  path?: string
  query?: string
  reason?: string
}

/** Validate an upstream pathname + search string. Returns the sanitized pair. */
export function checkUpstreamPath(pathname: string, search: string): AllowCheck {
  const cleanPath = pathname.replace(/^\/+/, '').replace(/\/+$/, '')
  if (!cleanPath || cleanPath.includes('..') || cleanPath.includes('%') || cleanPath.includes('\\')) {
    return { ok: false, reason: 'Malformed path' }
  }
  if (!PATH_PATTERNS.some((re) => re.test(cleanPath))) {
    return { ok: false, reason: `Path not allowed: ${cleanPath}` }
  }
  const params = new URLSearchParams(search)
  const out = new URLSearchParams()
  for (const [key, value] of params.entries()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return { ok: false, reason: `Query key not allowed: ${key}` }
    }
    if (!QUERY_VALIDATORS[key]!(value)) {
      return { ok: false, reason: `Invalid value for "${key}"` }
    }
    out.set(key, value)
  }
  return { ok: true, path: cleanPath, query: out.toString() }
}

/**
 * Turn an API-returned link (absolute URL on the production origin, or a root-absolute
 * path) into a same-origin proxy URL. Returns null for anything else — callers must
 * then render it as a labelled external link (https only) or drop it.
 */
export function toProxyUrl(link: string | null | undefined): string | null {
  if (!link) return null
  let pathname = ''
  let search = ''
  try {
    const url = new URL(link, PRODUCTION_API_ORIGIN)
    if (url.origin !== PRODUCTION_API_ORIGIN) return null
    pathname = url.pathname
    search = url.search
  } catch {
    return null
  }
  const check = checkUpstreamPath(pathname, search)
  if (!check.ok) return null
  return `/api/cricket/${check.path}${check.query ? `?${check.query}` : ''}`
}

/** True when a link may be rendered as a labelled external (https) link. */
export function isSafeExternalHref(link: string | null | undefined): boolean {
  if (!link) return false
  try {
    const url = new URL(link)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Derive the provider slug from an API-returned link or provider identity string.
 * Never trust the match ID alone — providers namespace IDs differently.
 */
export function providerFromLinkOrSource(link: string | null | undefined, source: string | null | undefined): 'espn' | 'crex' | 'cb' {
  const fromLink = typeof link === 'string' ? (link.match(/\/(espn|crex|cb)\//)?.[1] ?? null) : null
  if (fromLink === 'espn' || fromLink === 'crex' || fromLink === 'cb') return fromLink
  const s = (source ?? '').toLowerCase()
  if (s.startsWith('crex')) return 'crex'
  if (s.startsWith('espn')) return 'espn'
  return 'cb'
}

/** Parse `league` and `date` from an espn API link (authoritative per contract). */
export function parseEspnLinkParams(link: string | null | undefined): { league: string | null; date: string | null } {
  if (!link) return { league: null, date: null }
  try {
    const url = new URL(link, PRODUCTION_API_ORIGIN)
    const league = url.searchParams.get('league')
    const date = url.searchParams.get('date')
    return {
      league: league && /^\d{1,12}$/.test(league) ? league : null,
      date: date && /^\d{8}$/.test(date) ? date : null,
    }
  } catch {
    return { league: null, date: null }
  }
}
