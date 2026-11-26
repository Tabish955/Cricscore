/**
 * Browser-side data access. Everything goes through the same-origin proxy at
 * `/api/cricket/...`; the browser never calls the upstream host and never needs
 * a key. Fetch links supplied by the API itself via `toProxyUrl()` – they are
 * validated against the allowlist before they become requests.
 */
import {
  normalizeListPayload,
  normalizeMatchDetail,
  normalizeScorecard,
  normalizeCommentary,
  normalizeSquads,
  normalizeSeriesMatches,
  normalizeStandings,
  normalizeSportskeedaStandings,
  normalizeSearch,
  type ListOutcome,
  type MatchView,
  type ScorecardView,
  type CommentaryPageView,
  type SquadsView,
  type SeriesMatchesView,
  type StandingsView,
  type SportskeedaStandingsView,
  type SearchHitView,
} from './normalize'
import { toProxyUrl } from './allowlist'
import { SPORTSKEEDA_SLUG_RE } from '@/lib/sportskeeda'
import { isSampleMode } from '@/lib/sample/mode'
import {
  SAMPLE_LEAGUE,
  sampleListItems,
  sampleDetailByMatch,
  sampleScorecardByMatch,
  sampleCommentaryByMatch,
  sampleSquadsByMatch,
  sampleStandings,
  sampleEmptyStandings,
  sampleSeriesMatches,
  sampleEmptySeries,
  sampleSearchHits,
  sampleEnvelope,
} from '@/lib/sample/data'

const sampleMeta = (now = Date.now()) => ({ source: { upstream: 'sample', fetchedAt: new Date(now).toISOString(), cached: false, source: 'sample' } })

/** Sample-mode guard: unsupported entities fail loudly instead of inventing data. */
function sampleDetailPayload(match: MatchView): unknown {
  const hit = sampleDetailByMatch[match.matchId]
  if (hit) return hit
  const listItem = [...sampleListItems.live, ...sampleListItems.recent, ...sampleListItems.upcoming].find((m) => String(m.matchId) === match.matchId)
  if (listItem) return { success: true, result: { match: listItem }, meta: sampleMeta() }
  throw new ApiError('Sample mode has no recorded detail for this match.')
}
const sampleScorecardPayload = (match: MatchView): unknown => {
  const hit = sampleScorecardByMatch[match.matchId]
  if (!hit) throw new ApiError('Sample mode has no recorded scorecard for this match.')
  return hit
}
const sampleCommentaryPayload = (match: MatchView): unknown => {
  const hit = sampleCommentaryByMatch[match.matchId]
  if (!hit) throw new ApiError('Sample mode has no recorded commentary for this match.')
  return hit
}
const sampleSquadsPayload = (match: MatchView): unknown => {
  const hit = sampleSquadsByMatch[match.matchId]
  if (!hit) throw new ApiError('Sample mode has no recorded squads for this match.')
  return hit
}

export class ApiError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface Fetched<T> {
  data: T
  /** Wall-clock time of the last successful fetch from the website's perspective. */
  fetchedAtMs: number
}

async function proxyGet(proxyUrl: string, signal?: AbortSignal): Promise<unknown> {
  if (!/^\/api\/cricket\//.test(proxyUrl)) {
    throw new ApiError('Refusing to fetch a non-proxy URL.')
  }
  const res = await fetch(proxyUrl, { cache: 'no-store', signal })
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  const message =
    body && typeof body === 'object' && !Array.isArray(body)
      ? String((body as Record<string, unknown>).error ?? (body as Record<string, unknown>).message ?? '') || null
      : null
  if (!res.ok) {
    throw new ApiError(message ?? `Upstream returned HTTP ${res.status}.`, res.status)
  }
  if (body && typeof body === 'object' && (body as Record<string, unknown>).success === false) {
    throw new ApiError(message ?? 'The API reported a failure for this request.', res.status)
  }
  return body
}

export async function fetchList(kind: 'live' | 'recent' | 'upcoming', signal?: AbortSignal): Promise<Fetched<ListOutcome>> {
  if (isSampleMode()) {
    return { data: normalizeListPayload(sampleEnvelope(sampleListItems[kind], true), kind), fetchedAtMs: Date.now() }
  }
  const json = await proxyGet(`/api/cricket/cb/${kind}`, signal)
  return { data: normalizeListPayload(json, kind), fetchedAtMs: Date.now() }
}

export async function fetchMatchDetail(
  match: MatchView,
  signal?: AbortSignal,
): Promise<Fetched<MatchView | null>> {
  if (isSampleMode()) {
    return { data: normalizeMatchDetail(sampleDetailPayload(match), match), fetchedAtMs: Date.now() }
  }
  const proxy = toProxyUrl(match.links.detail)
  if (!proxy) throw new ApiError('No detail endpoint is available for this match.')
  const json = await proxyGet(proxy, signal)
  return { data: normalizeMatchDetail(json, match), fetchedAtMs: Date.now() }
}

export async function fetchScorecard(match: MatchView, signal?: AbortSignal): Promise<Fetched<ScorecardView>> {
  if (isSampleMode()) {
    return { data: normalizeScorecard(sampleScorecardPayload(match)), fetchedAtMs: Date.now() }
  }
  const proxy = toProxyUrl(match.links.scorecard)
  if (!proxy) throw new ApiError('No scorecard endpoint is available for this match.')
  const json = await proxyGet(proxy, signal)
  return { data: normalizeScorecard(json), fetchedAtMs: Date.now() }
}

export async function fetchCommentaryPage(
  match: MatchView,
  page: number,
  signal?: AbortSignal,
): Promise<Fetched<CommentaryPageView>> {
  if (isSampleMode()) {
    // Sample mode keeps a single recorded page; the payload itself states page 1.
    return { data: normalizeCommentary(sampleCommentaryPayload(match)), fetchedAtMs: Date.now() }
  }
  const proxy = toProxyUrl(match.links.commentary)
  if (!proxy) throw new ApiError('No commentary endpoint is available for this match.')
  const target = proxy.includes('?') ? `${proxy}&page=${page}` : `${proxy}?page=${page}`
  const json = await proxyGet(target, signal)
  return { data: normalizeCommentary(json), fetchedAtMs: Date.now() }
}

export async function fetchSquads(match: MatchView, signal?: AbortSignal): Promise<Fetched<SquadsView>> {
  if (isSampleMode()) {
    return { data: normalizeSquads(sampleSquadsPayload(match)), fetchedAtMs: Date.now() }
  }
  const proxy = toProxyUrl(match.links.squads)
  if (!proxy) throw new ApiError('No squads endpoint is available for this match.')
  const json = await proxyGet(proxy, signal)
  return { data: normalizeSquads(json), fetchedAtMs: Date.now() }
}

export async function fetchSeriesMatches(leagueId: string, date: string, signal?: AbortSignal): Promise<Fetched<SeriesMatchesView>> {
  if (!/^\d{1,12}$/.test(leagueId) || !/^\d{8}$/.test(date)) {
    throw new ApiError('A numeric league id and a YYYYMMDD date are required.')
  }
  if (isSampleMode()) {
    const json = leagueId === SAMPLE_LEAGUE ? sampleSeriesMatches() : sampleEmptySeries()
    return { data: normalizeSeriesMatches(json, leagueId, date), fetchedAtMs: Date.now() }
  }
  const json = await proxyGet(`/api/cricket/espn/series/${leagueId}/matches?date=${date}`, signal)
  return { data: normalizeSeriesMatches(json, leagueId, date), fetchedAtMs: Date.now() }
}

/**
 * Experimental Sportskeeda secondary standings source.
 * Only call with a slug from VERIFIED_SPORTSKEEDA_MAPPINGS after the backend
 * route ships. Throws otherwise – callers must degrade this source only.
 */
export async function fetchSportskeedaStandings(slug: string, signal?: AbortSignal): Promise<Fetched<SportskeedaStandingsView>> {
  if (!SPORTSKEEDA_SLUG_RE.test(slug)) {
    throw new ApiError('Invalid Sportskeeda series slug.')
  }
  if (isSampleMode()) {
    throw new ApiError('Sportskeeda is a live-only experimental source. Sample mode has no recorded payload for it.')
  }
  const json = await proxyGet(`/api/cricket/sportskeeda/series/${slug}/points-table`, signal)
  return { data: normalizeSportskeedaStandings(json), fetchedAtMs: Date.now() }
}

export async function fetchStandings(leagueId: string, signal?: AbortSignal): Promise<Fetched<StandingsView>> {
  if (!/^\d{1,12}$/.test(leagueId)) throw new ApiError('A numeric league id is required.')
  if (isSampleMode()) {
    const json = leagueId === SAMPLE_LEAGUE ? sampleStandings : sampleEmptyStandings(leagueId)
    return { data: normalizeStandings(json), fetchedAtMs: Date.now() }
  }
  const json = await proxyGet(`/api/cricket/espn/standings/${leagueId}`, signal)
  return { data: normalizeStandings(json), fetchedAtMs: Date.now() }
}

export async function fetchServerSearch(query: string, signal?: AbortSignal): Promise<Fetched<SearchHitView[]>> {
  const trimmed = query.trim()
  if (!trimmed) return { data: [], fetchedAtMs: Date.now() }
  if (isSampleMode()) {
    return { data: normalizeSearch(sampleSearchHits(trimmed)), fetchedAtMs: Date.now() }
  }
  const json = await proxyGet(`/api/cricket/cb/search?q=${encodeURIComponent(trimmed)}`, signal)
  const hits = normalizeSearch(json)
  return { data: hits, fetchedAtMs: Date.now() }
}

export interface DiagnosticsOutcome {
  ok: boolean
  status: number | null
  body: unknown
  fetchedAtMs: number
}

export async function fetchDiagnostics(kind: 'health' | 'sources/status'): Promise<DiagnosticsOutcome> {
  if (isSampleMode()) {
    // Honest: this is NOT a real API response – it says so inside the body too.
    const body =
      kind === 'health'
        ? { success: true, status: 'sample-mode', note: 'Sample mode is on. This is not a live API health check.' }
        : { success: true, mode: 'sample', note: 'Sample mode is on. Provider availability was not probed.', sources: [] }
    return { ok: true, status: 200, body, fetchedAtMs: Date.now() }
  }
  const res = await fetch(`/api/cricket/${kind}`, { cache: 'no-store' })
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  return { ok: res.ok, status: res.status, body, fetchedAtMs: Date.now() }
}
