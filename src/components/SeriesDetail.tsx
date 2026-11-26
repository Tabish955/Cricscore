'use client'

import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { fetchSeriesMatches, fetchStandings } from '@/lib/api/client'
import { POLL } from '@/lib/polling'
import { apiDateToInputValue, inputValueToApiDate, toApiDate } from '@/lib/format'
import { EmptyState, ErrorState, LoadingCard, CoverageNote } from '@/components/States'
import { MatchCard } from '@/components/MatchCard'
import { StandingsTable } from '@/components/StandingsTable'

export function SeriesDetail({ leagueId, initialDate }: { leagueId: string; initialDate?: string }) {
  const [dateValue, setDateValue] = useState(() => apiDateToInputValue(initialDate ?? toApiDate(new Date())))
  const apiDate = inputValueToApiDate(dateValue)

  const standingsQ = useQuery({
    queryKey: ['standings', leagueId],
    queryFn: ({ signal }) => fetchStandings(leagueId, signal),
    enabled: leagueId !== '',
    refetchInterval: POLL.standings,
    placeholderData: keepPreviousData,
  })
  const matchesQ = useQuery({
    queryKey: ['series-matches', leagueId, apiDate],
    queryFn: ({ signal }) => fetchSeriesMatches(leagueId, apiDate, signal),
    enabled: leagueId !== '',
    placeholderData: keepPreviousData,
  })

  if (!leagueId) {
    return (
      <EmptyState title="Invalid league id" hint="League IDs are numeric digits, as supplied by the provider. Go back to the series directory and pick a series.">
        <Link href="/series" className="rounded-md border border-edge bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand">Browse series →</Link>
      </EmptyState>
    )
  }

  const standings = standingsQ.data?.data
  const dated = matchesQ.data?.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">ESPN league · {leagueId}</p>
          <h1 className="text-xl font-black tracking-tight text-navy-900">Series scoreboard &amp; table</h1>
          <p className="text-[11px] text-slate-500">Dated matches and provider standings for this league — not a season archive or a complete fixture list.</p>
        </div>
        <Link href="/series" className="rounded-md border border-edge bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand">← All series</Link>
      </div>

      <section aria-labelledby="sd-matches" className="overflow-hidden rounded-xl border border-edge bg-card">
        <h2 id="sd-matches" className="flex flex-wrap items-center justify-between gap-2 border-b border-edge bg-navy-100/40 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-navy-900">
          Matches for selected date
          <label className="flex items-center gap-1.5 text-[10px] font-semibold normal-case tracking-normal text-slate-500">
            <span className="sr-only">Date</span>
            <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="rounded-md border border-edge bg-white px-2 py-1 text-[11px] tabular shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-brand" />
          </label>
        </h2>
        <div className="p-3">
          {matchesQ.isPending ? (
            <LoadingCard label="Fetching matches for that date…" />
          ) : matchesQ.isError && !dated ? (
            <ErrorState title="Couldn’t load matches" detail={matchesQ.error instanceof Error ? matchesQ.error.message : undefined} onRetry={() => matchesQ.refetch()} />
          ) : dated && dated.matches.length === 0 ? (
            <EmptyState title="No matches on this date" hint="The dated scoreboard only covers the chosen day — try another date." />
          ) : dated ? (
            <div className="grid gap-3 sm:grid-cols-2">{dated.matches.map((m) => <MatchCard key={m.key} match={m} />)}</div>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="sd-standings" className="overflow-hidden rounded-xl border border-edge bg-card">
        <h2 id="sd-standings" className="flex items-center justify-between border-b border-edge bg-navy-100/40 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-navy-900">
          Standings{standings?.season ? ` · Season ${standings.season}` : ''}
          {standingsQ.isFetching ? <span className="text-[9px] font-semibold normal-case text-slate-400">Refreshing…</span> : null}
        </h2>
        <div className="p-3">
          {standingsQ.isPending ? (
            <LoadingCard label="Fetching standings…" />
          ) : standingsQ.isError && !standings ? (
            <ErrorState title="Standings unavailable" detail={standingsQ.error instanceof Error ? standingsQ.error.message : undefined} onRetry={() => standingsQ.refetch()} />
          ) : standings ? (
            <StandingsTable view={standings} />
          ) : null}
        </div>
      </section>

      <CoverageNote>
        ESPN league IDs are not Cricbuzz/Cricinfo series IDs and the two must never be interchanged. This page shows only what the
        provider returned for the selected date and its standings groups — empty groups are usually bilateral series.
      </CoverageNote>
    </div>
  )
}
