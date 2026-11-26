/**
 * Display formatting. Everything here is null-safe: missing data renders as an
 * explicit "not supplied" style label, never as 1970, never as a fabricated zero.
 */

export function formatMatchDate(ms: number | null, opts: { withYear?: boolean } = {}): string {
  if (ms === null || !Number.isFinite(ms)) return 'Date not supplied'
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return 'Date not supplied'
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(opts.withYear ? { year: 'numeric' as const } : {}),
  })
}

export function formatMatchTime(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms)) return null
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatFetchedAt(ms: number | null): string {
  if (ms === null) return 'not fetched yet'
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return 'not fetched yet'
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** Overs are cricket notation: 19.5 = 19 overs and 5 balls. We display, never re-parse. */
export function formatOvers(overs: string | number | null | undefined): string {
  if (overs === null || overs === undefined || overs === '') return '—'
  return String(overs)
}

export function formatRate(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}

export function formatInt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return String(Math.round(v))
}

/** YYYYMMDD for the API's dated endpoints. */
export function toApiDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export function apiDateToInputValue(yyyymmdd: string): string {
  if (!/^\d{8}$/.test(yyyymmdd)) return ''
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

export function inputValueToApiDate(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  return m ? `${m[1]}${m[2]}${m[3]}` : toApiDate(new Date())
}

export function venueLine(ground: string, city: string, country: string): string {
  // Feeds frequently embed the city inside the ground string ('Eden Gardens, Kolkata');
  // split on commas and keep each piece once, case-insensitively.
  const seen = new Set<string>()
  const out: string[] = []
  for (const chunk of [ground, city, country]) {
    for (const piece of String(chunk ?? '').split(',')) {
      const p = piece.trim()
      if (!p) continue
      const key = p.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(p)
    }
  }
  return out.join(', ')
}

export function matchHref(m: { provider: string; matchId: string; links: { detail: string | null; scorecard: string | null; commentary?: string | null; squads?: string | null; upstream?: string | null } }): string {
  const base = `/match/${m.provider}/${encodeURIComponent(m.matchId)}`
  const espnLink = (m.links.detail ?? m.links.scorecard) as string | null
  if (!espnLink) return base
  try {
    const url = new URL(espnLink, 'https://cricketapi-beryl.vercel.app')
    const league = url.searchParams.get('league')
    const date = url.searchParams.get('date')
    const params = new URLSearchParams()
    if (league && /^\d{1,12}$/.test(league)) params.set('league', league)
    if (date && /^\d{8}$/.test(date)) params.set('date', date)
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  } catch {
    return base
  }
}
