/**
 * Normalization layer: raw API payloads -> app view models.
 *
 * Rules honoured here:
 *  - `0` is real data; a missing field is `null`, never fabricated.
 *  - epoch millisecond timestamps; anything else -> null (never "Invalid Date", never 1970).
 *  - provider identity is derived from the RETURNED LINK or `source`, never from the
 *    bare match ID; keys are `provider:id`.
 *  - provenance stays nested; we extract it defensively and never throw on it.
 *  - upstream HTML is never fetched or injected; all text is rendered as text.
 */
import {
  MatchListItemSchema,
  ListResponseSchema,
  MatchDetailResponseSchema,
  ScorecardResponseSchema,
  CommentaryResponseSchema,
  SquadsResponseSchema,
  SeriesMatchesResponseSchema,
  StandingsResponseSchema,
  SportskeedaStandingsResponseSchema,
  SearchResponseSchema,
} from './schema'
import { providerFromLinkOrSource, toProxyUrl } from './allowlist'

export type Provider = 'espn' | 'crex' | 'cb'

export interface TeamView {
  id: string | null
  name: string
  short: string
  imageUrl: string | null
  /** Feed-supplied flag URL when one exists; null/absent means "the API does not provide flags" — never inferred. */
  flagUrl?: string | null
}

export interface InningsScoreView {
  inningsId: number | null
  team: string
  score: string
  overs: string
  declared: boolean
  /** Provider-qualified id from `scores[].teamId` — the spec's join key to team1/team2. */
  teamId: string | null
}

export type MatchBadge = 'live' | 'result' | 'upcoming' | 'unknown'

export interface MatchView {
  /** Provider-namespaced key, e.g. `espn:1546783`. Safe for favorites/caches. */
  key: string
  provider: Provider
  matchId: string
  teams: string
  team1: TeamView | null
  team2: TeamView | null
  scores: InningsScoreView[]
  category: string
  live: boolean
  status: string
  state: string
  stateTitle: string
  seriesName: string
  seriesId: string | null
  format: string
  venueGround: string
  venueCity: string
  venueCountry: string
  startDateMs: number | null
  endDateMs: number | null
  /** CREX `startTimeText`: display-only, no timezone known – never parsed. */
  startTimeText: string | null
  source: string
  badge: MatchBadge
  badgeLabel: string
  links: {
    detail: string | null
    scorecard: string | null
    commentary: string | null
    squads: string | null
    upstream: string | null
  }
  playerOfTheMatch: string[]
}

export interface ProvenanceView {
  upstream: string | null
  fetchedAt: string | null
  cached: boolean | null
  source: string | null
  /** Scorecards carry player-statistics provenance one level deeper (meta.source.playerStatistics). */
  playerStatistics?: ProvenanceView | null
}

/* ---------------------------------------------------------------- helpers */

export function str(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  const s = String(v).trim()
  return s.length ? s : fallback
}

/** Number-like coercion. Keeps real 0, turns junk into null. */
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}

/** Epoch ms from contract, tolerant of seconds. Anything else -> null. */
export function parseEpochMs(v: unknown): number | null {
  const n = num(v)
  if (n === null) return null
  if (n >= 1e12) return n
  if (n >= 1e9) return Math.round(n * 1000)
  return null
}

function bool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null
}

function cleanUrl(v: unknown): string | null {
  const s = str(v, '')
  if (!s) return null
  try {
    const u = new URL(s, 'https://cricketapi-beryl.vercel.app')
    return u.protocol === 'https:' || u.protocol === 'http:' ? s : null
  } catch {
    return null
  }
}

export function extractProvenance(meta: unknown): ProvenanceView {
  const parseSource = (c: unknown): ProvenanceView => {
    const empty: ProvenanceView = { upstream: null, fetchedAt: null, cached: null, source: null }
    if (!c || typeof c !== 'object') return empty
    const r = c as Record<string, unknown>
    return {
      upstream: str(r.upstream) || null,
      fetchedAt: str(r.fetchedAt) || null,
      cached: typeof r.cached === 'boolean' ? r.cached : null,
      source: str(r.source) || null,
    }
  }
  if (!meta || typeof meta !== 'object') return { upstream: null, fetchedAt: null, cached: null, source: null }
  const m = meta as Record<string, unknown>
  const cand = (m.primary ?? m.source) as unknown
  if (!cand || typeof cand !== 'object') return { upstream: null, fetchedAt: null, cached: null, source: null }
  const base = parseSource(cand)
  const nested = (cand as Record<string, unknown>).playerStatistics
  if (nested && typeof nested === 'object') {
    base.playerStatistics = parseSource(nested)
  }
  return base
}

function teamView(t: { id?: unknown; name?: unknown; short?: unknown; imageUrl?: unknown; flagUrl?: unknown } | null | undefined): TeamView | null {
  if (!t) return null
  const name = str(t.name)
  const short = str(t.short)
  if (!name && !short) return null
  return {
    id: str(t.id) || null,
    name: name || short,
    short: short || name.slice(0, 4).toUpperCase(),
    imageUrl: cleanUrl(t.imageUrl),
    flagUrl: cleanUrl(t.flagUrl),
  }
}

function splitTeamsDisplay(display: string): [string, string] | null {
  const m = display.split(/\s+(?:vs\.?|v\.?|versus)\s+/i)
  return m.length === 2 && m[0] && m[1] ? [m[0].trim(), m[1].trim()] : null
}

const RESULT_RE = /\b(won by|beat|beaten|defeated|draw(?:n)?|tie[sd]?|abandon|no result|result|lost by)\b/i
const COMPLETED_STATE_RE = /\b(full time|innings break.*complete|stumps)\b/i

const STARTS_AT_RE = /^starts at\b/i

function deriveBadge(category: string, live: boolean, status: string, stateTitle: string): { badge: MatchBadge; badgeLabel: string } {
  const label = str(stateTitle) || str(status)
  // Never show LIVE for a fixture that has not started, even if the upstream flagged it 'in'.
  if (STARTS_AT_RE.test(str(status))) {
    // The fixture has not started – never surface an upstream 'Live' stateTitle next to it.
    return { badge: 'upcoming', badgeLabel: 'Upcoming' }
  }
  if (category === 'upcoming' || (!live && RESULT_RE.test(status) === false && /^(upcoming|scheduled|not started)/i.test(status))) {
    return { badge: 'upcoming', badgeLabel: label || 'Upcoming' }
  }
  if (live) return { badge: 'live', badgeLabel: label || 'Live' }
  if (RESULT_RE.test(status) || RESULT_RE.test(stateTitle) || category === 'recent') {
    return { badge: 'result', badgeLabel: label || 'Result' }
  }
  if (COMPLETED_STATE_RE.test(stateTitle)) return { badge: 'result', badgeLabel: label }
  return { badge: 'unknown', badgeLabel: label || 'Status unavailable' }
}

function normalizeScores(v: unknown): InningsScoreView[] {
  if (!Array.isArray(v)) return []
  const out: InningsScoreView[] = []
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const score = str(r.score)
    const team = str(r.team)
    const overs = str(r.overs)
    if (!score && !team) continue
    out.push({
      inningsId: num(r.inningsId),
      team,
      score,
      overs,
      declared: bool(r.declared) ?? false,
      teamId: str(r.teamId) || null,
    })
  }
  return out
}

/* ------------------------------------------------------------ list items */

function linksOf(raw: Record<string, unknown>) {
  const pick = (k: string) => str(raw[k]) || null
  return {
    detail: pick('detail'),
    scorecard: pick('scorecard'),
    commentary: pick('commentary'),
    squads: pick('squads'),
    upstream: pick('upstream'),
  }
}

export function normalizeMatch(rawInput: unknown, feedCategory?: string): MatchView | null {
  const parsed = MatchListItemSchema.safeParse(rawInput)
  if (!parsed.success) return null
  const raw = parsed.data
  const links = linksOf(raw as unknown as Record<string, unknown>)
  const provider = providerFromLinkOrSource(links.detail ?? links.scorecard ?? links.commentary ?? links.squads ?? links.upstream, raw.source)
  const matchId = str(raw.matchId)
  if (!matchId) return null

  const teams = str(raw.teams)
  const t1 = teamView(raw.team1)
  const t2 = teamView(raw.team2)
  const split = !t1 && !t2 && teams ? splitTeamsDisplay(teams) : null
  const category = str(raw.category) || feedCategory || ''
  const live = bool(raw.live) ?? category === 'live'
  const status = str(raw.status)
  const state = str(raw.state)
  const stateTitle = str(raw.stateTitle)
  const badge = deriveBadge(category, live, status, stateTitle)

  return {
    key: `${provider}:${matchId}`,
    provider,
    matchId,
    teams: teams || [t1?.name, t2?.name].filter(Boolean).join(' vs '),
    team1: t1 ?? (split ? { id: null, name: split[0]!, short: split[0]!.slice(0, 4).toUpperCase(), imageUrl: null } : null),
    team2: t2 ?? (split ? { id: null, name: split[1]!, short: split[1]!.slice(0, 4).toUpperCase(), imageUrl: null } : null),
    scores: normalizeScores(raw.scores),
    category,
    live,
    status,
    state,
    stateTitle,
    seriesName: str(raw.series),
    seriesId: str(raw.seriesId) || null,
    format: str(raw.format),
    venueGround: str(raw.venue?.ground),
    venueCity: str(raw.venue?.city),
    venueCountry: str(raw.venue?.country),
    startDateMs: parseEpochMs(raw.startDate),
    endDateMs: parseEpochMs(raw.endDate),
    startTimeText: str(raw.startTimeText) || null,
    source: str(raw.source),
    badge: badge.badge,
    badgeLabel: badge.badgeLabel,
    links,
    playerOfTheMatch: [],
  }
}

export interface ListOutcome {
  matches: MatchView[]
  found: boolean
  count: number
  provenance: ProvenanceView
}

export function normalizeListPayload(json: unknown, feedCategory?: string): ListOutcome {
  const parsed = ListResponseSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error('List response did not match the expected shape (HTML error page or API change).')
  }
  if (!parsed.data.success) {
    throw new Error('API reported failure for this feed.')
  }
  const rawMatches = parsed.data.result.matches ?? []
  const matches = rawMatches
    .map((m) => normalizeMatch(m, feedCategory))
    .filter((m): m is MatchView => m !== null)
  return {
    matches,
    found: parsed.data.result.found ?? matches.length > 0,
    count: parsed.data.result.count ?? matches.length,
    provenance: extractProvenance(parsed.data.meta),
  }
}

/* ------------------------------------------------------------- details */

export function normalizeMatchDetail(json: unknown, listFallback?: MatchView | null): MatchView | null {
  const parsed = MatchDetailResponseSchema.safeParse(json)
  if (!parsed.success || !parsed.data.success) return listFallback ?? null
  const raw = parsed.data.result.match
  const links = linksOf(raw as unknown as Record<string, unknown>)
  const provider = providerFromLinkOrSource(links.detail ?? links.scorecard, listFallback?.provider ?? 'espn')
  const matchId = str(raw.matchId) || listFallback?.matchId || ''
  if (!matchId) return listFallback ?? null

  // `series` is an object on detail ({id,name}) but a string on lists – handle both.
  let seriesName = str(raw.seriesName)
  let seriesId = str(raw.seriesId) || null
  const series = raw.series as unknown
  if (series && typeof series === 'object') {
    const s = series as Record<string, unknown>
    seriesName = seriesName || str(s.name)
    seriesId = seriesId || str(s.id) || null
  } else {
    seriesName = seriesName || str(series)
  }
  if (!seriesName && listFallback) seriesName = listFallback.seriesName
  if (!seriesId && listFallback) seriesId = listFallback.seriesId

  const category = str(raw.category) || listFallback?.category || ''
  const status = str(raw.status) || listFallback?.status || ''
  const stateTitle = str(raw.stateTitle) || listFallback?.stateTitle || ''
  // The ESPN detail payload carries its own live/state – never let a falsey
  // list-seed mask them (a fresh SSR sees 'unknown' otherwise).
  const live = Boolean(raw.live) || (listFallback?.live ?? false) || category === 'live' || str(raw.state) === 'in'
  const badge = deriveBadge(category, live, status, stateTitle)

  const rawScores = normalizeScores(raw.scores)
  // Detail scores are fresher than list scores for the same inningsId when present;
  // never let an older list overwrite a newer detail value and vice-versa – prefer
  // whichever side carries data, detail first.
  const scores = rawScores.length ? rawScores : (listFallback?.scores ?? [])

  return {
    key: `${provider}:${matchId}`,
    provider,
    matchId,
    teams: listFallback?.teams || [teamView(raw.team1)?.name, teamView(raw.team2)?.name].filter(Boolean).join(' vs '),
    team1: teamView(raw.team1) ?? listFallback?.team1 ?? null,
    team2: teamView(raw.team2) ?? listFallback?.team2 ?? null,
    scores,
    category,
    live,
    status,
    state: str(raw.state) || listFallback?.state || '',
    stateTitle,
    seriesName,
    seriesId,
    format: str(raw.format) || listFallback?.format || '',
    venueGround: str(raw.venue?.ground) || listFallback?.venueGround || '',
    venueCity: str(raw.venue?.city) || listFallback?.venueCity || '',
    venueCountry: str(raw.venue?.country) || listFallback?.venueCountry || '',
    startDateMs: parseEpochMs(raw.startDate) ?? listFallback?.startDateMs ?? null,
    endDateMs: listFallback?.endDateMs ?? null,
    startTimeText: listFallback?.startTimeText ?? null,
    source: listFallback?.source || provider,
    badge: badge.badge,
    badgeLabel: badge.badgeLabel,
    links: {
      detail: links.detail ?? listFallback?.links.detail ?? null,
      scorecard: links.scorecard ?? listFallback?.links.scorecard ?? null,
      commentary: links.commentary ?? listFallback?.links.commentary ?? null,
      squads: links.squads ?? listFallback?.links.squads ?? null,
      upstream: links.upstream ?? listFallback?.links.upstream ?? null,
    },
    playerOfTheMatch: Array.isArray(raw.playerOfTheMatch) ? raw.playerOfTheMatch.map((p) => str(p)).filter(Boolean) : [],
  }
}

/* ------------------------------------------------------------ scorecard */

export interface BatsmanView {
  position: number
  id: string | null
  name: string
  runs: number | null
  balls: number | null
  fours: number | null
  sixes: number | null
  strikeRate: number | null
  dismissal: string | null
  isBatting: boolean
}

export interface BowlerView {
  id: string | null
  name: string
  overs: string
  maidens: number | null
  runs: number | null
  wickets: number | null
  economy: number | null
  wides: number | null
  noBalls: number | null
}

export interface ExtrasView {
  total: number | null
  byes: number | null
  legByes: number | null
  noBalls: number | null
  wides: number | null
  penalties: number | null
}

export interface FallOfWicketView {
  wicketNumber: number | null
  /** Cricket notation exactly as supplied ("4.4"). Never parsed as decimal. */
  overs: string
  /** TEAM score at dismissal – not the dismissed batter's runs. */
  runs: number | null
  /** Provider fowType string, verbatim; may not be a conventional dismissal. */
  type: string | null
  batsmanId: string | null
  batsmanName: string | null
  batsmanRuns: number | null
  ballsFaced: number | null
}

export interface InningsEndpointView {
  overs: string
  runs: number | null
  wickets: number | null
}

export interface PartnershipBatsmanView {
  id: string | null
  name: string
  runs: number | null
  balls: number | null
}

export interface PartnershipView {
  wicketNumber: number | null
  type: string | null
  /** Partnership total INCLUDING relevant extras – batter contributions need not add up to this. */
  runs: number | null
  overs: string
  runRate: number | null
  start: InningsEndpointView | null
  end: InningsEndpointView | null
  batsmen: PartnershipBatsmanView[]
}

export interface InningsView {
  inningsId: number | null
  team: string
  /** Provider-qualified id from `innings[].teamId` when supplied; null otherwise. */
  teamId: string | null
  score: string
  overs: string
  declared: boolean
  batsmen: BatsmanView[]
  bowlers: BowlerView[]
  /** null = not supplied for this match; object = supplied (individual parts may still be null). */
  extras: ExtrasView | null
  /** null = not supplied; [] = explicitly nothing to report (e.g. no wickets yet). Provider order preserved. */
  fallOfWickets: FallOfWicketView[] | null
  /** null = not supplied; [] = explicitly none recorded. */
  partnerships: PartnershipView[] | null
}

export type CoverageLevel = 'full' | 'partial' | 'totals-only' | 'unknown'

export interface ScorecardView {
  matchId: string
  innings: InningsView[]
  coverage: string | null
  warnings: string[]
  coverageLevel: CoverageLevel
  provenance: ProvenanceView
}

export function normalizeScorecard(json: unknown): ScorecardView {
  const parsed = ScorecardResponseSchema.safeParse(json)
  if (!parsed.success || !parsed.data.success) {
    throw new Error('Scorecard response did not match the expected shape.')
  }
  const r = parsed.data.result
  const innings: InningsView[] = (r.innings ?? []).map((inn, i) => {
    const batsmen = (inn.batsmen ?? [])
      .map((b, idx) => ({
        position: num(b.position) ?? idx + 1,
        id: str(b.id) || null,
        name: str(b.name, 'Unknown player'),
        runs: num(b.runs),
        balls: num(b.balls),
        fours: num(b.fours),
        sixes: num(b.sixes),
        strikeRate: num(b.strikeRate),
        dismissal: str(b.dismissal) || null,
        isBatting: bool(b.isBatting) ?? false,
      }))
      .sort((a, b) => a.position - b.position)
    const bowlers = (inn.bowlers ?? []).map((b) => ({
      id: str(b.id) || null,
      name: str(b.name, 'Unknown bowler'),
      overs: str(b.overs ?? ''),
      maidens: num(b.maidens),
      runs: num(b.runs),
      wickets: num(b.wickets),
      economy: num(b.economy),
      wides: num(b.wides),
      noBalls: num(b.noBalls),
    }))
    const extras: ExtrasView | null = inn.extras
      ? {
          // ?? semantics: real zeros survive; junk becomes null; the provider total is
          // rendered as supplied and is NEVER recomputed from the breakdown.
          total: num(inn.extras.total) ?? null,
          byes: num(inn.extras.byes) ?? null,
          legByes: num(inn.extras.legByes) ?? null,
          noBalls: num(inn.extras.noBalls) ?? null,
          wides: num(inn.extras.wides) ?? null,
          penalties: num(inn.extras.penalties) ?? null,
        }
      : null
    const mapEndpoint = (e: { overs?: unknown; runs?: unknown; wickets?: unknown } | null | undefined): InningsEndpointView | null => {
      if (!e) return null
      const overs = str(e.overs ?? '')
      // An endpoint with no overs AND no runs is not an endpoint at all.
      if (!overs && num(e.runs) === null && num(e.wickets) === null) return null
      return { overs, runs: num(e.runs), wickets: num(e.wickets) }
    }
    const fallOfWickets: FallOfWicketView[] | null = inn.fallOfWickets
      ? inn.fallOfWickets.map((f) => ({
          wicketNumber: num(f.wicketNumber),
          overs: str(f.overs ?? ''),
          runs: num(f.runs),
          type: str(f.type) || null,
          batsmanId: str(f.batsman?.id) || null,
          batsmanName: str(f.batsman?.name) || null,
          batsmanRuns: num(f.batsmanRuns),
          ballsFaced: num(f.ballsFaced),
        }))
      : null // undefined and null both mean "not supplied"; [] stays [] (explicitly empty)
    const partnerships: PartnershipView[] | null = inn.partnerships
      ? inn.partnerships.map((pt) => ({
          wicketNumber: num(pt.wicketNumber),
          type: str(pt.type) || null,
          runs: num(pt.runs),
          overs: str(pt.overs ?? ''),
          runRate: num(pt.runRate),
          start: mapEndpoint(pt.start ?? null),
          end: mapEndpoint(pt.end ?? null),
          batsmen: (pt.batsmen ?? []).map((b) => ({
            id: str(b.id) || null,
            name: str(b.name, 'Unknown batter'),
            runs: num(b.runs),
            balls: num(b.balls),
          })),
        }))
      : null
    return {
      inningsId: inn.inningsId ?? i + 1,
      team: str(inn.team),
      teamId: str(inn.teamId) || null,
      score: scoreText(inn.score),
      overs: str(inn.overs),
      declared: bool(inn.declared) ?? false,
      batsmen,
      bowlers,
      extras,
      fallOfWickets,
      partnerships,
    }
  })

  const warnings = (r.warnings ?? []).map((w) => str(w)).filter(Boolean)
  const coverage = str(r.coverage) || null
  const hasDetails = innings.some((i) => i.batsmen.length > 0 || i.bowlers.length > 0)
  const hasTotals = innings.some((i) => i.score.length > 0)
  const cov = (coverage ?? '').toLowerCase()
  // The provider sends descriptive strings, not enums – live ESPN currently answers
  // "innings totals and available player statistics", which describes COMPLETE
  // batting/bowling tables. Classify by what actually arrived: every innings has
  // tables → full; some innings lack tables (or the provider says detail is
  // missing) → partial; no tables → totals-only. Never upgrade beyond the evidence.
  const someInningsMissing = innings.some((i) => i.batsmen.length === 0 || i.bowlers.length === 0)
  const covSaysPartial = /partial|missing|incomplete/.test(cov) || /\btotals?\s*only\b/.test(cov)
  let coverageLevel: CoverageLevel = 'unknown'
  if (!innings.length) coverageLevel = 'unknown'
  else if (!hasDetails) coverageLevel = 'totals-only'
  else if (someInningsMissing || covSaysPartial) coverageLevel = 'partial'
  else coverageLevel = 'full'

  return {
    matchId: str(r.matchId),
    innings,
    coverage,
    warnings,
    coverageLevel,
    provenance: extractProvenance(parsed.data.meta),
  }
}

function scoreText(v: unknown): string {
  const n = num(v)
  if (n !== null && typeof v === 'number') return String(n)
  return str(v)
}

/* ---------------------------------------------------------- commentary */

export type CommentaryEvent = 'wicket' | 'six' | 'four' | 'milestone' | 'info' | 'normal'

export interface CommentaryView {
  key: string
  inningsId: number | null
  overLabel: string
  event: CommentaryEvent
  eventRaw: string
  text: string
  runs: number | null
  batsman: string | null
  bowler: string | null
  cumulativeScore: string | null
  wicket: boolean
}

export interface CommentaryPageView {
  matchId: string
  page: number
  pageSize: number | null
  pageCount: number
  total: number | null
  items: CommentaryView[]
  provenance: ProvenanceView
}

function classifyEvent(item: { event?: unknown; wicket?: unknown; runs?: unknown; sixes?: unknown }): CommentaryEvent {
  const ev = str(item.event).toLowerCase()
  const wicket = item.wicket
  if (wicket === true || /wicket/.test(ev)) return 'wicket'
  const runs = num(item.runs)
  if (/six/.test(ev) || runs === 6) return 'six'
  if (/four/.test(ev) || runs === 4) return 'four'
  if (/milestone|fifty|hundred|century/.test(ev)) return 'milestone'
  if (ev && !/normal|delivery/.test(ev)) return 'info'
  return 'normal'
}

export function normalizeCommentary(json: unknown): CommentaryPageView {
  const parsed = CommentaryResponseSchema.safeParse(json)
  if (!parsed.success || !parsed.data.success) {
    throw new Error('Commentary response did not match the expected shape.')
  }
  const r = parsed.data.result
  const page = num(r.page) ?? 1
  const pageCount = Math.max(0, num(r.pageCount) ?? 0)
  const items: CommentaryView[] = (r.commentary ?? []).map((raw, i) => {
    const over = raw.over
    const overNum = num(over)
    // The feed publishes overs in cricket notation *inside* a lossy float plus a
    // separate ball counter (over: 41.1, ball: 1) — the integer part is the over.
    // Using Math.floor avoids the "41.1.1" double-decimal that broke ball-parsing.
    const overBase = overNum !== null ? String(Math.floor(overNum)) : str(over)
    const ballStr = str(raw.ball)
    const overLabel = ballStr ? (overBase ? `${overBase}.${ballStr}` : ballStr) : overBase || '–'
    const inningsId = num(raw.inningsId)
    const id = str(raw.id)
    const key = id || `${inningsId ?? 'x'}:${overLabel}:${i}:${str(raw.text).slice(0, 24)}`
    return {
      key,
      inningsId,
      overLabel,
      event: classifyEvent(raw),
      eventRaw: str(raw.event),
      text: str(raw.text),
      runs: num(raw.runs),
      batsman: str(raw.batsman) || null,
      bowler: str(raw.bowler) || null,
      cumulativeScore: str(raw.score) || null,
      wicket: raw.wicket === true || /wicket/i.test(str(raw.wicket)) || /wicket/i.test(str(raw.event)),
    }
  })
  return {
    matchId: str(r.matchId),
    page: Math.max(1, Math.floor(page)),
    pageSize: num(r.pageSize),
    pageCount,
    total: num(r.total),
    items,
    provenance: extractProvenance(parsed.data.meta),
  }
}

/** Pages are 1-based. Never request page 0; a zero pageCount means "no commentary". */
export function clampCommentaryPage(requested: number, pageCount: number): number {
  if (!Number.isFinite(requested) || requested < 1) return 1
  if (pageCount < 1) return 1
  return Math.min(Math.floor(requested), pageCount)
}

/** Page to fetch when the user hits "jump to latest". */
export function latestCommentaryPage(pageCount: number): number {
  return pageCount >= 1 ? pageCount : 1
}

/** Dedupe by provider-scoped play ID, keeping first occurrence (upstream order wins). */
export function dedupeCommentary(items: CommentaryView[]): CommentaryView[] {
  const seen = new Set<string>()
  return items.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true)))
}

/* ---------------------------------------------------------------- squads */

export interface PlayerView {
  id: string | null
  name: string
  role: string
  isCaptain: boolean | null
  isStarter: boolean | null
  battingStyle: string | null
  bowlingStyle: string | null
}

export interface SquadTeamView {
  teamId: string | null
  teamName: string
  players: PlayerView[]
}

export interface SquadsView {
  matchId: string
  teams: SquadTeamView[]
  provenance: ProvenanceView
}

export function normalizeSquads(json: unknown): SquadsView {
  const parsed = SquadsResponseSchema.safeParse(json)
  if (!parsed.success || !parsed.data.success) {
    throw new Error('Squads response did not match the expected shape.')
  }
  const r = parsed.data.result
  const teams: SquadTeamView[] = (r.teams ?? []).map((t) => ({
    teamId: str(t.teamId) || null,
    teamName: str(t.teamName, 'Unknown team'),
    players: (t.players ?? []).map((p) => ({
      id: str(p.id) || null,
      name: str(p.name, 'Unknown player'),
      role: str(p.role, 'Unknown'),
      isCaptain: typeof p.isCaptain === 'boolean' ? p.isCaptain : null,
      isStarter: typeof p.isStarter === 'boolean' ? p.isStarter : null,
      battingStyle: str(p.battingStyle) || null,
      bowlingStyle: str(p.bowlingStyle) || null,
    })),
  }))
  return { matchId: str(r.matchId), teams, provenance: extractProvenance(parsed.data.meta) }
}

/* ------------------------------------------------------- series / standings */

export interface SeriesMatchesView {
  count: number
  matches: MatchView[]
}

export function normalizeSeriesMatches(json: unknown, leagueId: string, date: string): SeriesMatchesView {
  const parsed = SeriesMatchesResponseSchema.safeParse(json)
  if (!parsed.success || !parsed.data.success) {
    throw new Error('Series matches response did not match the expected shape.')
  }
  const matches = (parsed.data.result.matches ?? [])
    .map((m) => normalizeMatch({ ...m, source: m.source ?? 'espn-site', seriesId: m.seriesId ?? leagueId, category: m.category, startDate: (m as Record<string, unknown>).startDate }, undefined))
    .filter((m): m is MatchView => m !== null)
  return { count: parsed.data.result.count ?? matches.length, matches }
}

export interface StandingEntryView {
  team: TeamView | null
  /** Known columns, null when absent – never fabricated. */
  known: {
    rank: number | null
    matchesPlayed: number | null
    matchesWon: number | null
    matchesLost: number | null
    matchesTied: number | null
    matchesDraw: number | null
    noresult: number | null
    matchPoints: number | null
    /** Kept verbatim as a string exactly as the provider sent it (signs preserved). */
    netrr: string | null
  }
  /**
   * Provider-verbatim display strings (displayStats), preferred for rendering –
   * e.g. "137/20.0" for for/against, or a signed NRR. Never parsed into runs.
   */
  display: Partial<Record<
    'rank' | 'matchesPlayed' | 'matchesWon' | 'matchesLost' | 'matchesTied' | 'matchesDraw' | 'noresult' | 'matchPoints' | 'netrr' | 'for' | 'against',
    string
  >>
  /** Every other stat the provider sent, for dynamic display. */
  extra: Record<string, string>
}

export interface StandingsGroupView {
  id: string | null
  name: string
  /** Group-scoped season year when the provider sends one (a group can differ from the league season). */
  season: number | null
  entries: StandingEntryView[]
}

export interface StandingsSeasonMeta {
  year: number | null
  startDate: string | null
  endDate: string | null
}

export interface StandingsView {
  leagueId: string
  name: string | null
  /** Season as a display label ("2026"); never "[object Object]". */
  season: string | null
  /** Validated raw season fields when the provider sent a season object; else null. */
  seasonMeta: StandingsSeasonMeta | null
  groups: StandingsGroupView[]
  provenance: ProvenanceView
}

const DISPLAY_KEY_MAP: Record<string, keyof StandingEntryView['display']> = {
  rank: 'rank',
  matchesplayed: 'matchesPlayed',
  matcheswon: 'matchesWon',
  matcheslost: 'matchesLost',
  matchestied: 'matchesTied',
  matchesdraw: 'matchesDraw',
  noresult: 'noresult',
  matchpoints: 'matchPoints',
  netrr: 'netrr',
  for: 'for',
  against: 'against',
}

export function normalizeStandings(json: unknown): StandingsView {
  const parsed = StandingsResponseSchema.safeParse(json)
  if (!parsed.success || !parsed.data.success) {
    throw new Error('Standings response did not match the expected shape.')
  }
  const r = parsed.data.result
  const knownKeys = new Map<string, keyof StandingEntryView['known']>([
    ['rank', 'rank'],
    ['matchesplayed', 'matchesPlayed'],
    ['matcheswon', 'matchesWon'],
    ['matcheslost', 'matchesLost'],
    ['matchestied', 'matchesTied'],
    ['matchesdraw', 'matchesDraw'],
    ['noresult', 'noresult'],
    ['matchpoints', 'matchPoints'],
    ['netrr', 'netrr'],
  ])

  // Season may be "2026", 2026, or { year, startDate, endDate }. Validate each path.
  const isoDate = (v: unknown): string | null => {
    const s = str(v)
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null
  }
  let season: string | null = null
  let seasonMeta: StandingsSeasonMeta | null = null
  const rawSeason = r.season
  if (typeof rawSeason === 'object' && rawSeason !== null) {
    const meta: StandingsSeasonMeta = { year: num(rawSeason.year), startDate: isoDate(rawSeason.startDate), endDate: isoDate(rawSeason.endDate) }
    if (meta.year !== null || meta.startDate || meta.endDate) seasonMeta = meta
    season = meta.year !== null ? String(Math.trunc(meta.year)) : null
  } else if (rawSeason !== null && rawSeason !== undefined && str(rawSeason)) {
    season = str(rawSeason)
  }

  const groups: StandingsGroupView[] = (r.groups ?? []).map((g) => ({
    id: str(g.id) || null,
    name: str(g.name, 'Table'),
    season: num(g.season),
    entries: (g.entries ?? []).map((e) => {
      const stats = e.stats ?? {}
      const displayStats = e.displayStats ?? {}
      const known: StandingEntryView['known'] = {
        rank: null,
        matchesPlayed: null,
        matchesWon: null,
        matchesLost: null,
        matchesTied: null,
        matchesDraw: null,
        noresult: null,
        matchPoints: null,
        netrr: null,
      }
      const display: StandingEntryView['display'] = {}
      const extra: Record<string, string> = {}
      for (const [k, v] of Object.entries(stats)) {
        if (v === null || v === undefined) continue
        const lk = k.toLowerCase()
        const target = knownKeys.get(lk)
        if (lk === 'netrr' || target === 'netrr') {
          known.netrr = str(v) // verbatim: sign and precision preserved
          continue
        }
        if (target) {
          known[target] = num(v) as never
          continue
        }
        extra[k] = str(v)
      }
      for (const [k, v] of Object.entries(displayStats)) {
        if (v === null || v === undefined) continue
        const lk = k.toLowerCase()
        const target = DISPLAY_KEY_MAP[lk]
        if (target) display[target] = str(v) // verbatim, never parsed
        else extra[k] = str(v)
      }
      // Numeric for/against are run-rate scale on ESPN; only shown if displayStats
      // is absent, and labelled as supplied numbers in the UI title.
      if (!display.for && stats['for'] !== null && stats['for'] !== undefined) display.for = str(stats['for'])
      if (!display.against && stats['against'] !== null && stats['against'] !== undefined) display.against = str(stats['against'])
      return { team: teamView(e.team ?? {}), known, display, extra }
    }),
  }))
  return {
    leagueId: str(r.leagueId),
    name: str(r.name) || null,
    season,
    seasonMeta,
    groups,
    provenance: extractProvenance(parsed.data.meta),
  }
}

/* --------------------------------------------------- experimental source */

export interface SportskeedaEntryView {
  team: TeamView | null
  stats: {
    rank: number | null
    matchesPlayed: number | null
    matchesWon: number | null
    matchesLost: number | null
    matchesTied: number | null
    matchesDraw: number | null
    noresult: number | null
    matchPoints: number | null
    netrr: number | null
  }
}

export interface SportskeedaGroupView {
  name: string
  entries: SportskeedaEntryView[]
}

export interface SportskeedaStandingsView {
  provider: 'sportskeeda'
  seriesSlug: string
  title: string
  /** Backend reports seasonVerified; anything other than literal true is treated as false. */
  seasonVerified: boolean
  warnings: string[]
  groups: SportskeedaGroupView[]
  provenance: ProvenanceView
}

export function normalizeSportskeedaStandings(json: unknown): SportskeedaStandingsView {
  const parsed = SportskeedaStandingsResponseSchema.safeParse(json)
  if (!parsed.success || !parsed.data.success) {
    throw new Error('Sportskeeda standings response did not match the expected shape.')
  }
  const r = parsed.data.result
  const groups: SportskeedaGroupView[] = (r.groups ?? []).map((g) => ({
    name: str(g.name, 'Table'),
    entries: (g.entries ?? []).map((e) => ({
      team: teamView(e.team ?? {}),
      stats: {
        rank: num(e.stats?.rank),
        matchesPlayed: num(e.stats?.matchesPlayed),
        matchesWon: num(e.stats?.matchesWon),
        matchesLost: num(e.stats?.matchesLost),
        matchesTied: num(e.stats?.matchesTied),
        matchesDraw: num(e.stats?.matchesDraw),
        noresult: num(e.stats?.noresult),
        matchPoints: num(e.stats?.matchPoints),
        netrr: num(e.stats?.netrr),
      },
    })),
  }))
  return {
    provider: 'sportskeeda',
    seriesSlug: str(r.seriesSlug),
    title: str(r.title, str(r.seriesSlug, 'Sportskeeda table')),
    seasonVerified: r.seasonVerified === true,
    warnings: (r.warnings ?? []).map((w) => str(w)).filter(Boolean),
    groups,
    provenance: extractProvenance(parsed.data.meta),
  }
}

/* --------------------------------------------------------------- search */

export interface SearchHitView {
  key: string
  matchId: string
  provider: Provider
  teams: string
  status: string
  live: boolean
  seriesName: string
  detailProxyUrl: string | null
}

export function normalizeSearch(json: unknown): SearchHitView[] {
  const parsed = SearchResponseSchema.safeParse(json)
  if (!parsed.success || !parsed.data.success) return []
  return (parsed.data.result.matches ?? []).map((m) => {
    const provider = providerFromLinkOrSource(m.detail, null)
    const matchId = str(m.matchId)
    return {
      key: `${provider}:${matchId}`,
      matchId,
      provider,
      teams: str(m.teams, 'Unknown fixture'),
      status: str(m.status),
      live: m.live === true,
      seriesName: str(m.series),
      detailProxyUrl: toProxyUrl(str(m.detail) || null),
    }
  })
}
