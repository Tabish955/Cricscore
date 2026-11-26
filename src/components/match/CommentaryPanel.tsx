'use client'

import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { MatchView, CommentaryView } from '@/lib/api/normalize'
import { clampCommentaryPage, dedupeCommentary, latestCommentaryPage } from '@/lib/api/normalize'
import { fetchCommentaryPage } from '@/lib/api/client'
import { POLL } from '@/lib/polling'
import { CoverageNote, ErrorState, LoadingCard } from '@/components/States'

const chipStyles: Record<CommentaryView['event'], string> = {
  wicket: 'bg-red-100 text-red-800 ring-red-300',
  six: 'bg-violet-100 text-violet-800 ring-violet-300',
  four: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  milestone: 'bg-amber-100 text-amber-900 ring-amber-300',
  info: 'bg-slate-100 text-slate-600 ring-slate-200',
  normal: 'bg-white text-slate-500 ring-edge',
}

function EventChip({ event }: { event: CommentaryView['event'] }) {
  if (event === 'normal') return null
  const label = event === 'wicket' ? 'WICKET' : event === 'six' ? 'SIX' : event === 'four' ? 'FOUR' : event === 'milestone' ? 'MILESTONE' : 'NOTE'
  return <span className={`rounded px-1 py-0.5 text-[8px] font-black uppercase tracking-wider ring-1 ${chipStyles[event]}`}>{label}</span>
}

export function CommentaryPanel({ match, league, date, isLive }: { match: MatchView; league: string | null; date: string | null; isLive: boolean }) {
  const [page, setPage] = useState(1)
  const [newestFirst, setNewestFirst] = useState(true)
  const [innings, setInnings] = useState<'all' | number>('all')
  const [following, setFollowing] = useState(false)

  const query = useQuery({
    queryKey: ['commentary', match.key, league, date, page],
    queryFn: ({ signal }) => fetchCommentaryPage(match, page, signal),
    refetchInterval: isLive ? POLL.commentaryLive : false,
    placeholderData: keepPreviousData,
  })

  const data = query.data?.data
  const pageCount = data?.pageCount ?? 0
  const pageSize = data?.pageSize ?? 25

  // Clamp when the server reports a smaller pageCount (e.g. zero coverage).
  useEffect(() => {
    if (data && pageCount >= 1 && page > pageCount) setPage(pageCount)
  }, [data, page, pageCount])

  const items = useMemo(() => {
    let list = dedupeCommentary(data?.items ?? [])
    if (innings !== 'all') list = list.filter((i) => i.inningsId === innings)
    return newestFirst ? [...list].reverse() : list
  }, [data?.items, innings, newestFirst])

  const inningsIds = useMemo(() => [...new Set((data?.items ?? []).map((i) => i.inningsId).filter((v): v is number => v !== null))].sort((a, b) => a - b), [data?.items])

  const jumpToLatest = () => {
    const target = latestCommentaryPage(pageCount)
    setPage(target)
    setFollowing(true)
  }

  if (query.isPending && !data) return <LoadingCard label="Fetching ball-by-ball…" />
  if (query.isError && !data) {
    return <ErrorState title="Commentary unavailable" detail={query.error instanceof Error ? query.error.message : 'Unknown error'} onRetry={() => query.refetch()} />
  }
  if (data && (pageCount === 0 || (data.items.length === 0 && page === 1))) {
    return (
      <CoverageNote>
        No ball-by-ball commentary is available for this match; the service answered with an empty response. We will not fabricate deliveries.
      </CoverageNote>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-card p-2">
        <div role="group" aria-label="Commentary order" className="flex overflow-hidden rounded-lg border border-edge text-[11px] font-bold">
          <button type="button" aria-pressed={newestFirst} onClick={() => setNewestFirst(true)} className={`px-2 py-1.5 ${newestFirst ? 'bg-pine-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Newest first</button>
          <button type="button" aria-pressed={!newestFirst} onClick={() => setNewestFirst(false)} className={`px-2 py-1.5 ${!newestFirst ? 'bg-pine-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Oldest first</button>
        </div>
        {inningsIds.length > 1 ? (
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            Innings
            <select value={innings === 'all' ? 'all' : String(innings)} onChange={(e) => setInnings(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="rounded-md border border-edge bg-white px-1.5 py-1.5 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">
              <option value="all">All</option>
              {inningsIds.map((n) => <option key={n} value={n}>Innings {n}</option>)}
            </select>
          </label>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => { setPage((p) => clampCommentaryPage(p - 1, pageCount)); setFollowing(false) }} disabled={page <= 1} className="rounded-md border border-edge bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass" aria-label="Previous page">← Prev</button>
          <span className="tabular rounded bg-slate-100 px-2 py-1.5 text-[10px] font-bold text-slate-600" aria-live="polite">Page {page} of {Math.max(pageCount, 1)}</span>
          <button type="button" onClick={() => { setPage((p) => clampCommentaryPage(p + 1, pageCount)); setFollowing(false) }} disabled={page >= pageCount} className="rounded-md border border-edge bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass" aria-label="Next page">Next →</button>
          <button type="button" onClick={jumpToLatest} disabled={pageCount < 1 || page === pageCount} className="rounded-md bg-brass-light px-2 py-1.5 text-[11px] font-black uppercase text-pine-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">Jump to latest</button>
          <button type="button" onClick={() => query.refetch()} className="rounded-md border border-edge bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">{query.isFetching ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>

      {query.isError && data ? <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-900">Refresh failed; showing page {page} from the last good response.</p> : null}
      <p className="text-[9px] text-slate-400">Page 1 is the first page of the record, not necessarily the newest ball. Pages hold ~{pageSize} deliveries. {isLive ? 'Live pages poll every 20s while this tab is visible.' : 'Completed match – no polling.'}</p>

      {/* Deliveries */}
      <ol className="flex flex-col gap-2" aria-live="off">
        {items.length === 0 ? (
          <li className="rounded-lg border border-dashed border-edge bg-card px-3 py-4 text-center text-[11px] text-slate-500">No deliveries on this page{innings !== 'all' ? ' for the selected innings' : ''}.</li>
        ) : items.map((item) => (
          <li key={item.key} className={`rounded-xl border px-3.5 py-2.5 ${item.event === 'wicket' ? 'border-red-200 bg-red-50/50' : item.event === 'six' || item.event === 'four' ? 'border-emerald-200 bg-emerald-50/40' : 'border-edge bg-card'}`}>
            <div className="flex items-start gap-2">
              <span className="tabular mt-0.5 inline-flex w-10 shrink-0 justify-center rounded bg-pine-900 px-1 py-0.5 text-[9px] font-black text-white">{item.overLabel}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <EventChip event={item.event} />
                  {item.runs !== null ? <span className="tabular text-[10px] font-bold text-slate-500">{item.runs} run{item.runs === 1 ? '' : 's'}</span> : null}
                  {item.cumulativeScore ? <span className="tabular text-[10px] font-bold text-pine-900">{item.cumulativeScore}</span> : null}
                  {item.batsman ? <span className="text-[9px] text-slate-400">{item.batsman}{item.bowler ? ` · ${item.bowler}` : ''}</span> : null}
                </div>
                {item.text ? <p className="mt-1 text-[13px] leading-6 text-slate-700">{item.text}</p> : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-[9px] text-slate-400">Commentary is reproduced verbatim, not written by Cricline. Overs are cricket notation.</p>
    </div>
  )
}
