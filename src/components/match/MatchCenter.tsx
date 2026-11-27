'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  fetchList,
  fetchMatchDetail,
  fetchScorecard,
  fetchSquads,
  fetchStandings,
  fetchSeriesMatches,
  type Fetched,
} from '@/lib/api/client'
import { POLL } from '@/lib/polling'
import { useOnlineStatus } from '@/lib/hooks'
import { venueLine, formatMatchDate, formatMatchTime } from '@/lib/format'
import type { MatchView } from '@/lib/api/normalize'
import { parseScoreText, splitScoreForDisplay } from '@/lib/score'
import { teamAssetsFromMatches } from '@/lib/teamAssets'
import { TeamIdentity } from '@/components/TeamIdentity'
import { RatesLine } from '@/components/RatesLine'
import { StatusBadge } from '@/components/StatusBadge'
import { BallOverlay, type ScoreMoment } from './BallOverlay'
import { FetchStatus } from '@/components/FetchStatus'
import { CoverageNote, ErrorState, LoadingCard, Spinner } from '@/components/States'
import { FavoriteMatchButton } from '@/components/FavoriteToggle'
import { ScorecardView } from './ScorecardView'
import { CommentaryPanel } from './CommentaryPanel'
import { OverStrip } from './OverStrip'
import { SquadsPanel } from './SquadsPanel'
import { TablePanel } from './TablePanel'

const TAB_DEFS = [
  { id: 'overview', label: 'Overview' },
  { id: 'scorecard', label: 'Scorecard' },
  { id: 'commentary', label: 'Commentary' },
  { id: 'squads', label: 'Squads' },
  { id: 'table', label: 'Table' },
] as const
type TabId = (typeof TAB_DEFS)[number]['id']

function espnSeed(matchId: string, league: string | null, date: string | null): MatchView {
  const qs = new URLSearchParams()
  if (league) qs.set('league', league)
  if (date) qs.set('date', date)
  const suffix = qs.toString() ? `?${qs}` : ''
  return {
    key: `espn:${matchId}`,
    provider: 'espn',
    matchId,
    teams: '',
    team1: null,
    team2: null,
    scores: [],
    category: '',
    live: false,
    status: '',
    state: '',
    stateTitle: '',
    seriesName: '',
    seriesId: league,
    format: '',
    venueGround: '',
    venueCity: '',
    venueCountry: '',
    startDateMs: null,
    endDateMs: null,
    startTimeText: null,
    source: 'espn-site',
    badge: 'unknown',
    badgeLabel: 'Status unknown',
    links: {
      detail: `/espn/match/${matchId}${suffix}`,
      scorecard: `/espn/match/${matchId}/scorecard${suffix}`,
      commentary: `/espn/match/${matchId}/commentary${suffix}`,
      squads: `/espn/match/${matchId}/squads${league ? `?league=${league}` : ''}`,
      upstream: null,
    },
    playerOfTheMatch: [],
  }
}

function genericSeed(provider: string, matchId: string): MatchView {
  return { ...espnSeed(matchId, null, null), key: `${provider}:${matchId}`, provider: provider as MatchView['provider'], source: provider, links: { detail: null, scorecard: null, commentary: null, squads: null, upstream: null } }
}

export function MatchCenter({ provider, matchId, league, date, tab }: { provider: 'espn' | 'crex' | 'cb'; matchId: string; league: string | null; date: string | null; tab: string }) {
  const router = useRouter()
  const online = useOnlineStatus()
  const activeTab: TabId = (TAB_DEFS.some((t) => t.id === tab) ? tab : 'overview') as TabId
  const isEspn = provider === 'espn'
  const canDeepDive = isEspn && !!league

  // --- pull current feeds to locate the match (authoritative list context) ---
  const liveQ = useQuery({ queryKey: ['cb-list', 'live'], queryFn: ({ signal }) => fetchList('live', signal), refetchInterval: POLL.liveList, placeholderData: keepPreviousData })
  const recentQ = useQuery({ queryKey: ['cb-list', 'recent'], queryFn: ({ signal }) => fetchList('recent', signal), refetchInterval: POLL.recentList, placeholderData: keepPreviousData })
  const upcomingQ = useQuery({ queryKey: ['cb-list', 'upcoming'], queryFn: ({ signal }) => fetchList('upcoming', signal), refetchInterval: POLL.upcomingList, placeholderData: keepPreviousData })

  const listMatch = useMemo(() => {
    const key = `${provider}:${matchId}`
    for (const q of [liveQ.data, recentQ.data, upcomingQ.data]) {
      const hit = q?.data.matches.find((m) => m.key === key || m.matchId === matchId)
      if (hit) return hit
    }
    return null
  }, [provider, matchId, liveQ.data, recentQ.data, upcomingQ.data])

  const listsPending = !liveQ.data && !recentQ.data && !upcomingQ.data && (liveQ.isPending || recentQ.isPending || upcomingQ.isPending)

  const seed = useMemo(() => {
    if (listMatch) return listMatch
    if (isEspn) return espnSeed(matchId, league, date)
    return genericSeed(provider, matchId)
  }, [listMatch, isEspn, matchId, league, date, provider])

  const isLive = (listMatch?.live ?? false) || seed.category === 'live'

  // --- ESPN deep-dive queries (detail + scorecard poll fast while live) ---
  const detailQ = useQuery({
    queryKey: ['match-detail', seed.key, league, date],
    enabled: isEspn && !!seed.links.detail,
    queryFn: ({ signal }) => fetchMatchDetail(seed, signal),
    refetchInterval: isLive ? POLL.matchDetailLive : false,
    placeholderData: keepPreviousData,
  })

  const scorecardQ = useQuery({
    queryKey: ['scorecard', 'v2-extended', seed.key, league, date],
    enabled: isEspn && !!seed.links.scorecard,
    queryFn: ({ signal }) => fetchScorecard(seed, signal),
    refetchInterval: isLive ? POLL.scorecardLive : false,
    placeholderData: keepPreviousData,
  })

  const squadsQ = useQuery({
    queryKey: ['squads', seed.key, league],
    enabled: isEspn && activeTab === 'squads' && !!seed.links.squads,
    queryFn: ({ signal }) => fetchSquads(seed, signal),
    refetchInterval: isLive ? POLL.squads : false,
    placeholderData: keepPreviousData,
  })

  const detail = detailQ.data?.data ?? null
  const match = detail ?? listMatch ?? seed
  useEffect(() => {
    teamAssetsFromMatches([match])
  }, [match])

  const effLive = match.live || isLive
  const pollMs = effLive ? POLL.matchDetailLive : false

  const setTab = useCallback(
    (next: TabId) => {
      const params = new URLSearchParams()
      if (league) params.set('league', league)
      if (date) params.set('date', date)
      if (next !== 'overview') params.set('tab', next)
      const qs = params.toString()
      router.replace(`/match/${provider}/${encodeURIComponent(matchId)}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [router, provider, matchId, league, date],
  )

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const visibleTabs = TAB_DEFS.filter((t) => t.id !== 'table' || canDeepDive)

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % visibleTabs.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + visibleTabs.length) % visibleTabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = visibleTabs.length - 1
    else return
    event.preventDefault()
    setTab(visibleTabs[next]!.id)
    tabRefs.current[next]?.focus()
  }

  const [momentOpen, setMomentOpen] = useState(false)
  const [moment, setMoment] = useState<ScoreMoment | null>(null)
  const prevScoresRef = useRef<Map<string, { runs: number; wickets: number }> | null>(null)
  const momentTimerRef = useRef<number | null>(null)

  // Watch the polled scores; when a side moves, fire the score-moment burst.
  useEffect(() => {
    const next = new Map<string, { runs: number; wickets: number }>()
    for (const s of match.scores) {
      const parsed = parseScoreText(s.score)
      if (parsed) next.set(`${s.team}`.toLowerCase(), parsed)
    }
    const prev = prevScoresRef.current
    if (prev) {
      for (const s of match.scores) {
        const parsed = next.get(s.team.toLowerCase())
        const before = prev.get(s.team.toLowerCase())
        if (!parsed || !before) continue
        const runsDelta = parsed.runs - before.runs
        const wicketDelta = parsed.wickets - before.wickets
        if (runsDelta > 0 || wicketDelta > 0) {
          const side = headerSideForScore(match, s)
          if (!side) continue
          setMoment({ id: Date.now(), side, runsDelta, wicketDelta, scoreText: s.score, label: momentLabel(runsDelta, wicketDelta) })
          if (momentTimerRef.current) window.clearTimeout(momentTimerRef.current)
          momentTimerRef.current = window.setTimeout(() => setMoment(null), 2600)
          break
        }
      }
    }
    prevScoresRef.current = next
  }, [match])

  useEffect(() => () => {
    if (momentTimerRef.current) window.clearTimeout(momentTimerRef.current)
  }, [])

  const venue = venueLine(match.venueGround, match.venueCity, match.venueCountry)
  const time = formatMatchTime(match.startDateMs)
  const dateText = match.startDateMs ? `${formatMatchDate(match.startDateMs, { withYear: true })}${time ? ` · ${time}` : ''}` : match.startTimeText ?? null
  const lastOk = detailQ.dataUpdatedAt || liveQ.dataUpdatedAt || null
  const stale = (detailQ.isError && !!(detailQ.data ?? listMatch)) || (liveQ.isError && !liveQ.data)
  const refreshAll = () => { void detailQ.refetch(); void scorecardQ.refetch(); void liveQ.refetch(); void recentQ.refetch(); void upcomingQ.refetch() }

  const headerMatch: MatchView = match

  return (
    <div className="flex flex-col gap-5">
      {!online ? (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          You appear to be offline; polling paused. Showing last good data.
        </p>
      ) : null}

      {/* Scoreboard – sticky on larger screens; the score itself is the tappable moment */}
      <section aria-label="Match score" className="z-30 rounded-2xl border border-pine-800 bg-pine-950 p-4 text-[#f5f0e4] shadow-card sm:sticky sm:top-[64px] sm:p-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="min-w-0 flex-1 basis-60">
            {headerMatch.seriesName ? <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-brass-light">{headerMatch.seriesName}{headerMatch.format ? ` · ${headerMatch.format}` : ''}</p> : <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brass-light">{headerMatch.format || 'Series not supplied'}</p>}
            <div className="mt-2 flex flex-col gap-1.5">
              {([1, 2] as const).map((side) => {
                const team = side === 1 ? headerMatch.team1 : headerMatch.team2
                const fallbackName = side === 1 ? splitTeams(headerMatch)?.[0] : splitTeams(headerMatch)?.[1]
                const label = team?.name ?? fallbackName ?? (side === 1 ? 'Team 1' : 'Team 2')
                const assetKey = team?.id ? `${headerMatch.provider}:${team.id}` : `${headerMatch.provider}:${team?.name ?? (side === 1 ? 't1' : 't2')}`
                return (
                  <div key={side} className="flex items-center gap-3 border-b border-white/10 py-2 last:border-b-0 last:pb-1">
                    <TeamIdentity assetKey={assetKey} name={label} short={team?.short} imageUrl={team?.imageUrl} flagUrl={team?.flagUrl} size="md" />
                    <span className="flex min-w-0 flex-1 items-center truncate text-lg font-bold text-paper sm:text-xl" title={label}>
                      {label}
                    </span>
                    <ScoreMomentButton match={headerMatch} side={side} moment={moment} onOpen={() => setMomentOpen(true)} />
                  </div>
                )
              })}
              <RatesLine scores={headerMatch.scores} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge badge={match.badge} label={match.badgeLabel} />
            <FavoriteMatchButton
              match={{
                key: match.key,
                provider: match.provider,
                matchId: match.matchId,
                label: match.teams || `${match.team1?.name ?? '?'} vs ${match.team2?.name ?? '?'}`,
                seriesName: match.seriesName,
                href: `/match/${match.provider}/${encodeURIComponent(match.matchId)}${league ? `?league=${league}${date ? `&date=${date}` : ''}` : ''}`,
              }}
            />
          </div>
        </div>
        {match.status ? <p className="mt-2.5 border-t border-white/10 pt-2.5 font-display text-[13px] font-semibold italic leading-snug text-emerald-200/90">{match.status}</p> : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-[#a9bfb0]">
          {venue ? <span className="max-w-[60%] truncate" title={venue}>{venue}</span> : null}
          {dateText ? <span className="tabular">{dateText}</span> : null}
          <span className="ml-auto hidden text-[10px] text-[#718f7d] sm:inline">Tap a score to replay the latest ball</span>
        </div>
        <FetchStatus
          lastOkMs={lastOk}
          isFetching={detailQ.isFetching || scorecardQ.isFetching}
          isStale={stale}
          onRefresh={refreshAll}
          compact
        />
      </section>

      {/* Runs bar: the latest balls of this over, for live matches with coverage */}
      {effLive && canDeepDive ? <OverStrip match={headerMatch} isLive={effLive} /> : null}

      {/* Tabs */}
      <div role="tablist" aria-label="Match sections" className="flex gap-1 overflow-x-auto border-b border-edge pb-2 pt-1">
        {visibleTabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el }}
            role="tab"
            aria-selected={activeTab === t.id}
            tabIndex={activeTab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass ${
              activeTab === t.id ? 'bg-pine-900 text-[#f5f0e4] shadow-sm' : 'text-slate-500 hover:bg-pine-100 hover:text-pine-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* No match in current data and no deep-dive possible */}
      {!isEspn && !listMatch && !listsPending ? (
        <CoverageNote>
          This match is not in the current live, recent or upcoming lists, and no deeper detail is published for it.
          Showing only what this page knows. <a className="underline" href="/">Back to the Live Center</a>
        </CoverageNote>
      ) : null}

      {/* Panels */}
      {activeTab === 'overview' ? (
        <OverviewNotices match={match} canDeepDive={canDeepDive} />
      ) : null}
      {activeTab === 'scorecard' ? (
        canDeepDive ? (
          scorecardQ.isPending ? <LoadingCard label="Fetching scorecard…" /> : scorecardQ.isError && !scorecardQ.data ? (
            <ErrorState title="Scorecard unavailable" detail={scorecardQ.error instanceof Error ? scorecardQ.error.message : undefined} onRetry={() => scorecardQ.refetch()} />
          ) : scorecardQ.data ? (
            <ScorecardView view={scorecardQ.data.data} stale={scorecardQ.isError} refreshedAt={scorecardQ.dataUpdatedAt} onRefresh={() => scorecardQ.refetch()} isFetching={scorecardQ.isFetching} matchContext={{ matchId, league, date }} />
          ) : null
        ) : (
          <LimitedCoverage what="a full batting/bowling scorecard" />
        )
      ) : null}
      {activeTab === 'commentary' ? (
        canDeepDive ? (
          <CommentaryPanel match={match} league={league} date={date} isLive={effLive} />
        ) : (
          <LimitedCoverage what="ball-by-ball commentary" />
        )
      ) : null}
      {activeTab === 'squads' ? (
        canDeepDive ? (
          squadsQ.isPending ? <LoadingCard label="Fetching squads…" /> : squadsQ.isError && !squadsQ.data ? (
            <ErrorState title="Squads unavailable" detail={squadsQ.error instanceof Error ? squadsQ.error.message : undefined} onRetry={() => squadsQ.refetch()} />
          ) : squadsQ.data ? (
            <SquadsPanel view={squadsQ.data.data} />
          ) : null
        ) : (
          <LimitedCoverage what="squad lists" />
        )
      ) : null}
      {activeTab === 'table' && canDeepDive ? (
        <TablePanel match={match} league={league!} date={date ?? dateFromMs(match.startDateMs)} />
      ) : null}

      {momentOpen ? <BallOverlay match={headerMatch} fallback={moment} onClose={() => setMomentOpen(false)} /> : null}
    </div>
  )
}

function momentLabel(runsDelta: number, wicketDelta: number): string {
  if (wicketDelta > 0 && runsDelta === 0) return 'WICKET'
  if (wicketDelta > 0) return `WICKET +${runsDelta}`
  if (runsDelta === 6) return 'SIX'
  if (runsDelta === 4) return 'FOUR'
  return `+${runsDelta}`
}

function dateFromMs(ms: number | null): string {
  const d = ms ? new Date(ms) : new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  if (Number.isNaN(d.getTime())) return `${new Date().getFullYear()}${p(new Date().getMonth() + 1)}${p(new Date().getDate())}`
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

/** Which side (1 or 2) a score entry belongs to; mirrors the score button's matching. */
function headerSideForScore(m: MatchView, score: MatchView['scores'][number]): 1 | 2 | null {
  const t = score.team.toLowerCase()
  const lower1 = (m.team1?.name ?? '').toLowerCase()
  const sh1 = (m.team1?.short ?? '').toLowerCase()
  const lower2 = (m.team2?.name ?? '').toLowerCase()
  const sh2 = (m.team2?.short ?? '').toLowerCase()
  const hit1 = lower1 && t && (t === lower1 || t === sh1 || lower1.includes(t) || t.includes(lower1))
  const hit2 = lower2 && t && (t === lower2 || t === sh2 || lower2.includes(t) || t.includes(lower2))
  if (hit1) return 1
  if (hit2) return 2
  return null
}

function splitTeams(m: MatchView): [string, string] | null {
  const parts = (m.teams || '').split(/\s+(?:vs\.?|v\.?|versus)\s+/i)
  return parts.length === 2 ? [parts[0]!, parts[1]!] : null
}

/**
 * The score itself is the tappable moment. Fresh ball → burst chip + ping
 * ring on the figure; tap → replay overlay of the recorded ball.
 */
function ScoreMomentButton({ match, side, moment, onOpen }: { match: MatchView; side: 1 | 2; moment: ScoreMoment | null; onOpen: () => void }) {
  const team = side === 1 ? match.team1 : match.team2
  const label = team?.name ?? ''
  const hit = match.scores.find((s) => {
    const t = s.team.toLowerCase()
    const n = label.toLowerCase()
    const sh = (team?.short ?? '').toLowerCase()
    return t && (t === n || t === sh || n.includes(t) || t.includes(n))
  })
  if (!hit) return <span className="score-nums text-sm text-[#a9bfb0]">–</span>
  const disp = splitScoreForDisplay(hit.score)
  const fresh = moment?.side === side ? moment : null
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label} ${hit.score}${hit.overs ? `, ${hit.overs} overs` : ''}. Replay the latest ball.`}
      className="group relative -mx-1.5 rounded-lg px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
    >
      <span className={`score-nums flex items-baseline whitespace-nowrap font-display text-2xl font-black leading-none text-brass-light transition-transform duration-150 group-hover:scale-[1.04] group-hover:text-[#f5d98a] sm:text-[30px] ${fresh ? 'ball-ping' : ''}`}>
        {disp.main}
        {hit.declared ? '*' : ''}
        {hit.overs ? <span className="score-nums ml-1.5 font-sans text-[11px] font-semibold text-[#a9bfb0]">({hit.overs} ov)</span> : disp.sub ? <span className="score-nums ml-1.5 font-sans text-[10px] font-semibold text-[#a9bfb0]">{disp.sub}</span> : null}
      </span>
      {fresh ? (
        <span key={fresh.id} aria-hidden="true" className="burst-rise pointer-events-none absolute -top-3.5 left-1 rounded-md bg-brass-light px-1.5 py-0.5 text-[10px] font-black uppercase leading-none tracking-[0.12em] text-pine-950 shadow">
          {fresh.label}
        </span>
      ) : null}
    </button>
  )
}

function OverviewNotices({ match, canDeepDive }: { match: MatchView; canDeepDive: boolean }) {
  const venue = venueLine(match.venueGround, match.venueCity, match.venueCountry)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-edge bg-card p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Match details</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            <dt className="text-slate-400">Status</dt><dd className="font-semibold text-slate-800">{match.status || 'Not supplied'}</dd>
            <dt className="text-slate-400">Venue</dt><dd className="font-semibold text-slate-800">{venue || 'Venue not supplied'}</dd>
            <dt className="text-slate-400">Start</dt><dd className="font-semibold text-slate-800 tabular">{match.startDateMs ? formatMatchDate(match.startDateMs, { withYear: true }) : match.startTimeText ?? 'Not supplied'}</dd>
            <dt className="text-slate-400">Format</dt><dd className="font-semibold text-slate-800">{match.format || 'Unknown'}</dd>
            <dt className="text-slate-400">Series</dt><dd className="font-semibold text-slate-800">{match.seriesName || 'Not supplied'}</dd>
            {match.playerOfTheMatch.length ? (<><dt className="text-slate-400">Player of the match</dt><dd className="font-semibold text-slate-800">{match.playerOfTheMatch.join(', ')}</dd></>) : null}
          </dl>
        </section>
        <section className="rounded-xl border border-edge bg-card p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">What this page can show</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-600">
            <li>Toss, weather, umpires and pitch reports are <strong>not shown</strong>. They are never invented.</li>
            <li>Extras, fall of wickets and partnerships render when the scorecard includes them.</li>
            <li>{canDeepDive ? 'Scorecard, squads and commentary load on demand for this match.' : 'No per-match detail is published for this fixture; scores come from the list view only.'}</li>
          </ul>
        </section>
      </div>
      {match.status ? null : (
        <CoverageNote>Status text is not published for this match. Showing structural data only.</CoverageNote>
      )}
    </div>
  )
}

function LimitedCoverage({ what }: { what: string }) {
  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-5 text-center">
      <p className="text-sm font-bold text-amber-900">Limited coverage: {what}</p>
      <p className="mt-1 text-xs text-slate-600">
        {what[0]!.toUpperCase() + what.slice(1)} is not published for this fixture. It will not be invented or scraped to fill the gap.
      </p>
    </div>
  )
}
