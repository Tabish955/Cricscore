'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchList } from '@/lib/api/client'
import { listPollInterval } from '@/lib/polling'
import { useOnlineStatus, useDebouncedValue } from '@/lib/hooks'
import { rememberTeamAssets } from '@/lib/storage'
import { MatchCard } from '@/components/MatchCard'
import { HeroMatch } from '@/components/HeroMatch'
import { FetchStatus } from '@/components/FetchStatus'
import { LoadingCard, EmptyState, ErrorState } from '@/components/States'
import { sortByImportance } from '@/lib/importance'

type Tab = 'live' | 'recent' | 'upcoming'
const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: 'live', label: 'Live', hint: 'In play now' },
  { id: 'recent', label: 'Recent', hint: 'Completed / latest results' },
  { id: 'upcoming', label: 'Upcoming', hint: 'Scheduled fixtures' },
]

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('live')
  const [text, setText] = useState('')
  const [format, setFormat] = useState<string>('all')
  const [series, setSeries] = useState<string>('all')
  const queryText = useDebouncedValue(text, 350)
  const online = useOnlineStatus()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const query = useQuery({
    queryKey: ['cb-list', tab],
    queryFn: ({ signal }) => fetchList(tab, signal),
    refetchInterval: listPollInterval(tab),
    placeholderData: keepPreviousData,
  })

  const result = query.data?.data
  const matches = useMemo(() => sortByImportance(result?.matches ?? []), [result])

  // Populate the verified team-asset registry from what the feed actually served.
  useEffect(() => {
    if (!matches.length) return
    rememberTeamAssets(
      matches.flatMap((m) => [
        { key: m.team1?.id ? `${m.provider}:${m.team1.id}` : '', imageUrl: m.team1?.imageUrl ?? null },
        { key: m.team2?.id ? `${m.provider}:${m.team2.id}` : '', imageUrl: m.team2?.imageUrl ?? null },
      ]).filter((e) => e.key),
    )
  }, [matches])

  const formats = useMemo(() => [...new Set(matches.map((m) => m.format || 'Unknown'))].sort(), [matches])
  const seriesList = useMemo(() => [...new Set(matches.map((m) => m.seriesName).filter(Boolean))].sort(), [matches])

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase()
    return matches.filter((m) => {
      if (format !== 'all' && (m.format || 'Unknown') !== format) return false
      if (series !== 'all' && m.seriesName !== series) return false
      if (!q) return true
      const hay = [m.teams, m.seriesName, m.venueGround, m.venueCity, m.team1?.name, m.team2?.name, m.format, m.status]
        .filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [matches, queryText, format, series])

  const onTabKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = TABS.length - 1
    else return
    event.preventDefault()
    const target = TABS[next]!
    setTab(target.id)
    tabRefs.current[next]?.focus()
  }, [])

  const fetchedAtMs = query.dataUpdatedAt || null
  // The first live match (importance order) is promoted into the scoreboard hero.
  const featured = tab === 'live' ? filtered.find((m) => m.badge === 'live') ?? null : null
  const gridItems = featured ? filtered.filter((m) => m !== featured) : filtered

  return (
    <div className="flex flex-col gap-6">
      {/* Page heading + freshness */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-4xl font-black tracking-tight text-pine-950 sm:text-5xl">Match Center</h1>
          <p className="mt-2 max-w-md text-xs leading-5 text-slate-500 sm:text-[13px]">Live, recent and upcoming fixtures, most important first. Times in your local zone.</p>
        </div>
        <FetchStatus
          lastOkMs={fetchedAtMs}
          isFetching={query.isFetching}
          isStale={query.isError && !!result}
          onRefresh={() => query.refetch()}
          compact
        />
      </div>

      {!online ? (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          You appear to be offline. Polling is paused; scores on screen are the last good data.
        </p>
      ) : null}

      {/* Tabs */}
      <div role="tablist" aria-label="Match lists" className="flex gap-1 border-b border-edge">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el }}
            role="tab"
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            title={t.hint}
            className={`-mb-px min-h-[48px] rounded-t-md border-b-2 px-5 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass ${
              tab === t.id ? 'border-brass text-pine-950' : 'border-transparent text-slate-500 hover:text-pine-900'
            }`}
          >
            {t.label}
            {tab === t.id && result ? <span className="tabular ml-1.5 text-[10px] font-semibold text-pine-700">{result.count}</span> : null}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Filter matches by team, series or venue</span>
          <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            type="search"
            placeholder="Filter by team, series, venue…"
            className="w-full rounded-xl border border-edge bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          Format
          <select value={format} onChange={(e) => setFormat(e.target.value)} className="rounded-lg border border-edge bg-white px-2.5 py-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">
            <option value="all">All</option>
            {formats.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          Series
          <select value={series} onChange={(e) => setSeries(e.target.value)} className="max-w-[220px] rounded-lg border border-edge bg-white px-2 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">
            <option value="all">All series</option>
            {seriesList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {/* Content */}
      {query.isPending ? (
        <LoadingCard label={`Fetching ${tab} matches…`} />
      ) : query.isError && !result ? (
        <ErrorState
          title={`Could not load ${tab} matches`}
          detail={query.error instanceof Error ? query.error.message : 'Unknown error'}
          onRetry={() => query.refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={matches.length === 0 ? `No ${tab} matches right now` : 'Nothing matches these filters'}
          hint={matches.length === 0
            ? 'This is a valid empty state. The service answered with zero matches, and the site is not broken.'
            : 'Clear the search or filters to see more.'}
        >
          {matches.length > 0 ? (
            <button type="button" onClick={() => { setText(''); setFormat('all'); setSeries('all') }} className="rounded-md border border-edge bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">
              Clear filters
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-5">
          {featured ? <HeroMatch match={featured} /> : null}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {gridItems.map((m) => <MatchCard key={m.key} match={m} />)}
          </div>
        </div>
      )}

      {query.isError && result ? (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900">
          Refresh failed ({query.error instanceof Error ? query.error.message : 'network error'}). Scores above are the last good data, retrying automatically with backoff.
        </p>
      ) : null}
    </div>
  )
}
