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
import { isSafeExternalHref } from '@/lib/api/allowlist'
import type { MatchView } from '@/lib/api/normalize'
import { teamAssetsFromMatches } from '@/lib/teamAssets'
import { TeamIdentity } from '@/components/TeamIdentity'
import { StatusBadge } from '@/components/StatusBadge'
import { FetchStatus } from '@/components/FetchStatus'
import { CoverageNote, ErrorState, LoadingCard, Spinner } from '@/components/States'
import { FavoriteMatchButton } from '@/components/FavoriteToggle'
import { ScorecardView } from './ScorecardView'
import { CommentaryPanel } from './CommentaryPanel'
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
    queryKey: ['scorecard', seed.key, league, date],
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

  const venue = venueLine(match.venueGround, match.venueCity, match.venueCountry)
  const time = formatMatchTime(match.startDateMs)
  const dateText = match.startDateMs ? `${formatMatchDate(match.startDateMs, { withYear: true })}${time ? ` · ${time}` : ''}` : match.startTimeText ?? null
  const lastOk = detailQ.dataUpdatedAt || liveQ.dataUpdatedAt || null
  const stale = (detailQ.isError && !!(detailQ.data ?? listMatch)) || (liveQ.isError && !liveQ.data)
  const refreshAll = () => { void detailQ.refetch(); void scorecardQ.refetch(); void liveQ.refetch(); void recentQ.refetch(); void upcomingQ.refetch() }

  const headerMatch: MatchView = match

  return (
    <div className="flex flex-col gap-3">
      {!online ? (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-deep">
          You appear to be offline — polling paused. Showing last good data.
        </p>
      ) : null}

      {/* Sticky score header */}
      <section aria-label="Match score" className="sticky top-[52px] z-30 rounded-xl border border-navy-800 bg-navy-900 p-3 text-white shadow-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1 basis-56">
            {headerMatch.seriesName ? <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-amber-brand/90">{headerMatch.seriesName}{headerMatch.format ? ` · ${headerMatch.format}` : ''}</p> : <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-brand/90">{headerMatch.format || 'Series not supplied'}</p>}
            <div className="mt-1 flex items-center gap-3">
              <TeamIdentity assetKey={headerMatch.team1?.id ? `${headerMatch.provider}:${headerMatch.team1.id}` : `${headerMatch.provider}:${headerMatch.team1?.name ?? 't1'}`} name={headerMatch.team1?.name ?? 'Team 1'} short={headerMatch.team1?.short} imageUrl={headerMatch.team1?.imageUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="truncate text-sm font-bold sm:text-base">{headerMatch.team1?.name ?? splitTeams(headerMatch)?.[0] ?? 'Team not supplied'}</span>
                  <ScoreText match={headerMatch} side={1} />
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="truncate text-sm font-bold sm:text-base">{headerMatch.team2?.name ?? splitTeams(headerMatch)?.[1] ?? 'Team not supplied'}</span>
                  <ScoreText match={headerMatch} side={2} />
                </div>
              </div>
              <TeamIdentity assetKey={headerMatch.team2?.id ? `${headerMatch.provider}:${headerMatch.team2.id}` : `${headerMatch.provider}:${headerMatch.team2?.name ?? 't2'}`} name={headerMatch.team2?.name ?? 'Team 2'} short={headerMatch.team2?.short} imageUrl={headerMatch.team2?.imageUrl} size="lg" />
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
        {match.status ? <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[11px] font-semibold text-emerald-200/90">{match.status}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] text-navy-100/70">
          {venue ? <span className="max-w-[60%] truncate" title={venue}>{venue}</span> : null}
          {dateText ? <span className="tabular">{dateText}</span> : null}
          <span className="ml-auto">
            via <span className="font-bold uppercase">{match.provider}</span>
          </span>
        </div>
        <FetchStatus
          lastOkMs={lastOk}
          isFetching={detailQ.isFetching || scorecardQ.isFetching}
          isStale={stale}
          provider={null}
          onRefresh={refreshAll}
          compact
        />
      </section>

      {/* Tabs */}
      <div role="tablist" aria-label="Match sections" className="sticky top-[calc(52px+72px)] z-20 -mx-1 flex gap-1 overflow-x-auto bg-paper/95 px-1 py-1 backdrop-blur">
        {visibleTabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el }}
            role="tab"
            aria-selected={activeTab === t.id}
            tabIndex={activeTab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand ${
              activeTab === t.id ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:bg-navy-100 hover:text-navy-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Not found in feeds + no ESPN deep-dive */}
      {!isEspn && !listMatch && !listsPending ? (
        <CoverageNote>
          This {provider.toUpperCase()} match is not in the current live/recent/upcoming feeds, and this provider exposes no
          detail endpoint we can call. Showing what the route knows only. <a className="underline" href="/">Back to the Live Center</a>
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
          <LimitedCoverage provider={provider} links={match.links} what="a full batting/bowling scorecard" />
        )
      ) : null}
      {activeTab === 'commentary' ? (
        canDeepDive ? (
          <CommentaryPanel match={match} league={league} date={date} isLive={effLive} />
        ) : (
          <LimitedCoverage provider={provider} links={match.links} what="ball-by-ball commentary" />
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
          <LimitedCoverage provider={provider} links={match.links} what="squad lists" />
        )
      ) : null}
      {activeTab === 'table' && canDeepDive ? (
        <TablePanel match={match} league={league!} date={date ?? dateFromMs(match.startDateMs)} />
      ) : null}
    </div>
  )
}

function dateFromMs(ms: number | null): string {
  const d = ms ? new Date(ms) : new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  if (Number.isNaN(d.getTime())) return `${new Date().getFullYear()}${p(new Date().getMonth() + 1)}${p(new Date().getDate())}`
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

function splitTeams(m: MatchView): [string, string] | null {
  const parts = (m.teams || '').split(/\s+(?:vs\.?|v\.?|versus)\s+/i)
  return parts.length === 2 ? [parts[0]!, parts[1]!] : null
}

function ScoreText({ match, side }: { match: MatchView; side: 1 | 2 }) {
  const team = side === 1 ? match.team1 : match.team2
  const label = team?.name ?? ''
  const hit = match.scores.find((s) => {
    const t = s.team.toLowerCase()
    const n = label.toLowerCase()
    const sh = (team?.short ?? '').toLowerCase()
    return t && (t === n || t === sh || n.includes(t) || t.includes(n))
  })
  if (!hit) return <span className="score-nums text-xs text-navy-100/60">—</span>
  return (
    <span className="score-nums text-base font-black text-amber-brand sm:text-lg">
      {hit.score}
      {hit.declared ? '*' : ''}
      {hit.overs ? <span className="ml-1 text-[10px] font-semibold text-navy-100/60">({hit.overs})</span> : null}
    </span>
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
            <dt className="text-slate-400">Status</dt><dd className="font-semibold text-slate-800">{match.status || 'Not supplied by the provider'}</dd>
            <dt className="text-slate-400">Venue</dt><dd className="font-semibold text-slate-800">{venue || 'Venue not supplied'}</dd>
            <dt className="text-slate-400">Start</dt><dd className="font-semibold text-slate-800 tabular">{match.startDateMs ? formatMatchDate(match.startDateMs, { withYear: true }) : match.startTimeText ?? 'Not supplied — the API does not always send dates'}</dd>
            <dt className="text-slate-400">Format</dt><dd className="font-semibold text-slate-800">{match.format || 'Unknown'}</dd>
            <dt className="text-slate-400">Series</dt><dd className="font-semibold text-slate-800">{match.seriesName || 'Not supplied'}</dd>
            {match.playerOfTheMatch.length ? (<><dt className="text-slate-400">Player of the match</dt><dd className="font-semibold text-slate-800">{match.playerOfTheMatch.join(', ')}</dd></>) : null}
          </dl>
        </section>
        <section className="rounded-xl border border-edge bg-card p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">What the API can see</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-600">
            <li>Toss, weather, umpires and pitch reports are <strong>not exposed</strong> — deliberately shown as missing, never invented.</li>
            <li>Extras, fall of wickets and partnerships: shown only when the scorecard endpoint sends them (older backend responses won&rsquo;t include them).</li>
            <li>{canDeepDive ? 'Scorecard, squads and commentary load from the ESPN detail endpoints on demand.' : 'This provider exposes no per-match detail endpoints — scores come from the list feed only.'}</li>
          </ul>
        </section>
      </div>
      {match.status ? null : (
        <CoverageNote>Status text is missing from the provider for this match. Showing structural data only.</CoverageNote>
      )}
    </div>
  )
}

function LimitedCoverage({ provider, links, what }: { provider: string; links: MatchView['links']; what: string }) {
  const externalCandidate = links.upstream || links.detail
  const external = isSafeExternalHref(externalCandidate) ? externalCandidate : null
  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-5 text-center">
      <p className="text-sm font-bold text-amber-deep">Limited coverage: {what}</p>
      <p className="mt-1 text-xs text-slate-600">
        The {provider.toUpperCase()} feed does not expose {what} on this API. We will not invent it, and we will not fetch
        the source&apos;s web pages as if they were data.
      </p>
      {external ? (
        <a
          href={external}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-deep shadow-sm hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand"
        >
          View on source (external)
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>
        </a>
      ) : null}
    </div>
  )
}
