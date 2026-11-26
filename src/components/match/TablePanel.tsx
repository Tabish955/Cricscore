'use client'

import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { MatchView, StandingEntryView } from '@/lib/api/normalize'
import { fetchStandings, fetchSeriesMatches } from '@/lib/api/client'
import { POLL } from '@/lib/polling'
import { MatchCard } from '@/components/MatchCard'
import { CoverageNote, EmptyState, ErrorState, LoadingCard } from '@/components/States'
import { inputValueToApiDate, apiDateToInputValue } from '@/lib/format'

import { StandingsTable } from '@/components/StandingsTable'
import { SportskeedaAdditionalSource } from '@/components/SportskeedaAdditionalSource'

export function TablePanel({ match, league, date }: { match: MatchView; league: string; date: string }) {
  const [dateValue, setDateValue] = useState(apiDateToInputValue(date))
  const apiDate = inputValueToApiDate(dateValue)

  const standingsQ = useQuery({
    queryKey: ['standings', league],
    queryFn: ({ signal }) => fetchStandings(league, signal),
    refetchInterval: POLL.standings,
    placeholderData: keepPreviousData,
  })

  const seriesQ = useQuery({
    queryKey: ['series-matches', league, apiDate],
    queryFn: ({ signal }) => fetchSeriesMatches(league, apiDate, signal),
    placeholderData: keepPreviousData,
  })

  const standings = standingsQ.data?.data
  const dated = seriesQ.data?.data

  return (
    <div className="flex flex-col gap-4">
      {/* Standings */}
      <section aria-labelledby="standings-h" className="overflow-hidden rounded-xl border border-edge bg-card">
        <h2 id="standings-h" className="flex flex-wrap items-center justify-between gap-2 border-b border-edge bg-navy-100/40 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-navy-900">
          Standings{standings?.season ? ` · Season ${standings.season}` : ''}
          {standingsQ.isFetching ? <span className="text-[9px] font-semibold normal-case tracking-normal text-slate-400">Refreshing…</span> : null}
        </h2>
        <div className="p-3">
          {standingsQ.isPending ? (
            <LoadingCard label="Fetching standings…" />
          ) : standingsQ.isError && !standings ? (
            <ErrorState title="Standings unavailable" detail={standingsQ.error instanceof Error ? standingsQ.error.message : undefined} onRetry={() => standingsQ.refetch()} />
          ) : standings ? (
            <StandingsTable view={standings} />
          ) : null}
          <div className="mt-3">
            <SportskeedaAdditionalSource leagueId={league} />
          </div>
        </div>
      </section>

      {/* Dated scoreboard */}
      <section aria-labelledby="dated-h" className="overflow-hidden rounded-xl border border-edge bg-card">
        <h2 id="dated-h" className="flex flex-wrap items-center justify-between gap-2 border-b border-edge bg-navy-100/40 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-navy-900">
          Matches for selected date
          <label className="flex items-center gap-1.5 text-[10px] font-semibold normal-case tracking-normal text-slate-500">
            <span className="sr-only">Pick a date</span>
            <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="rounded-md border border-edge bg-white px-2 py-1 text-[11px] tabular shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand" />
          </label>
        </h2>
        <div className="p-3">
          <p className="mb-2 text-[10px] text-slate-400">A dated scoreboard, not a season calendar — only the selected day appears, from the provider.</p>
          {seriesQ.isPending ? (
            <LoadingCard label="Fetching that date…" />
          ) : seriesQ.isError && !dated ? (
            <ErrorState title="No matches for this date" detail={seriesQ.error instanceof Error ? seriesQ.error.message : undefined} onRetry={() => seriesQ.refetch()} />
          ) : dated && dated.matches.length === 0 ? (
            <EmptyState title="No matches on this date" hint="Try another date — this list reflects only what the provider returned for the league." />
          ) : dated ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {dated.matches.map((m) => <MatchCard key={m.key} match={m} />)}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
