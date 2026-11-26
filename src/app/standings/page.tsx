'use client'

import { useQueries } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchList, fetchStandings } from '@/lib/api/client'
import { listPollInterval, POLL } from '@/lib/polling'
import { StandingsTable } from '@/components/StandingsTable'
import { EmptyState, ErrorState, LoadingCard, CoverageNote } from '@/components/States'

export default function StandingsPage() {
  const [leagueInput, setLeagueInput] = useState('')
  const [activeLeague, setActiveLeague] = useState<string | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)

  const results = useQueries({
    queries: (['live', 'recent', 'upcoming'] as const).map((kind) => ({
      queryKey: ['cb-list', kind],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchList(kind, signal),
      refetchInterval: listPollInterval(kind),
    })),
  })

  const discovered = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of results) {
      for (const m of r.data?.data.matches ?? []) {
        if (m.provider === 'espn' && m.seriesId && !map.has(m.seriesId)) {
          map.set(m.seriesId, m.seriesName || `League ${m.seriesId}`)
        }
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [results])

  const standingsQ = useQuery({
    queryKey: ['standings', activeLeague],
    queryFn: ({ signal }) => fetchStandings(activeLeague!, signal),
    enabled: !!activeLeague,
    refetchInterval: POLL.standings,
    placeholderData: keepPreviousData,
  })

  const choose = (id: string) => {
    setInputError(null)
    setActiveLeague(id)
    setLeagueInput(id)
  }

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const v = leagueInput.trim()
    if (!/^\d{1,12}$/.test(v)) {
      setInputError('League IDs are numeric digits, exactly what appears in the fixture links.')
      return
    }
    choose(v)
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-black tracking-tight text-pine-900">Standings</h1>
        <p className="text-[11px] text-slate-500">Published tables only. Nothing is computed from the matches shown; no invented points, NRR or ranks.</p>
      </div>

      <section aria-label="Choose a league" className="rounded-xl border border-edge bg-card p-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Leagues seen in current data</h2>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {discovered.length === 0 ? (
            <p className="text-[11px] text-slate-400">No league is visible in the current data right now.</p>
          ) : discovered.map(({ id, name }) => (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              aria-pressed={activeLeague === id}
              className={`max-w-[260px] truncate rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass ${activeLeague === id ? 'border-pine-900 bg-pine-900 text-white' : 'border-edge bg-white text-slate-600 hover:text-pine-900'}`}
              title={`${name} (${id})`}
            >
              {name}
            </button>
          ))}
        </div>
        <form onSubmit={submitManual} className="mt-3 flex flex-wrap items-center gap-2 border-t border-edge/70 pt-3">
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
            Or enter a league id
            <input inputMode="numeric" value={leagueInput} onChange={(e) => setLeagueInput(e.target.value)} placeholder="e.g. 20921" className="tabular w-36 rounded-md border border-edge bg-white px-2 py-1.5 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass" />
          </label>
          <button type="submit" className="rounded-md bg-pine-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-pine-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">Show table</button>
          {inputError ? <p role="alert" className="w-full text-[10px] font-semibold text-red-700">{inputError}</p> : null}
        </form>
      </section>

      {activeLeague ? (
        <section aria-label="League table" className="overflow-hidden rounded-xl border border-edge bg-card">
          <div className="p-3">
            {standingsQ.isPending ? (
              <LoadingCard label="Fetching standings…" />
            ) : standingsQ.isError && !standingsQ.data ? (
              <ErrorState title="Standings unavailable" detail={standingsQ.error instanceof Error ? standingsQ.error.message : undefined} onRetry={() => standingsQ.refetch()} />
            ) : standingsQ.data ? (
              <StandingsTable view={standingsQ.data.data} />
            ) : null}
          </div>
        </section>
      ) : (
        <EmptyState title="Pick a league to see its table" hint="League IDs observed in current data appear above; or paste any numeric league id." />
      )}
      <CoverageNote>Empty groups usually mean bilateral series (no league table exists). Net run rate is displayed exactly as published; missing values render as a dash.</CoverageNote>
    </div>
  )
}
